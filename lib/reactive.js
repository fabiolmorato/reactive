import { compile } from "./jst/index.js";

// all of the reactive states in the application
const states = {};
window.__reactive_states__ = states;

// all of the compiled templates in the application
const templates = {};

// all the root dependencies of the templates
// if a template uses a variable "foo.bar.baz", then the root dependency is "foo"
// this is used to trigger reactivity when a root dependency changes
const stateTemplateDependencies = {};

const reactiveObservers = [];
const reactiveComputedValues = [];
const reactivePersistedValues = [];

let loadedOnce = false;
const INITIAL_VALUE = Symbol("initial value");

const reactiveQueue = {};
const updatedTemplates = {};
let reactiveQueueTimeout = null;


function enqueueReactive (path, stateName) {
  if (!reactiveQueue[stateName]) {
    reactiveQueue[stateName] = new Set();
  }

  reactiveQueue[stateName].add(path);

  if (!reactiveQueueTimeout) {
    reactiveQueueTimeout = setTimeout(() => {
      for (const stateName in reactiveQueue) {
        for (const path of reactiveQueue[stateName]) {
          triggerReactive(path, stateName);
        }
      }

      clearReactiveQueue();
      reactiveQueueTimeout = null;
    });
  }
}

function clearReactiveQueue () {
  for (const key in reactiveQueue) {
    delete reactiveQueue[key];
  }

  for (const key in updatedTemplates) {
    delete updatedTemplates[key];
  }
}

class SmartValue {
  constructor () {
    this.state = null;
    this.stateName = "";
    this.propertyName = "";
    this.initialized = false;
  }

  init (state, stateName, propertyName) {
    this.state = state;
    this.stateName = stateName;
    this.propertyName = propertyName;
    this.initialized = true;
  }

  notify () {
    if (this.stateName && this.propertyName) {
      enqueueReactive(this.propertyName, this.stateName);
    }
  }
}

class ComputedValue extends SmartValue {
  constructor (callback) {
    super();
    this.callback = callback;
    this.value = INITIAL_VALUE;
    // setTimeout(() => {
    //   this.update()
    // });
  }

  get () {
    if (this.value === INITIAL_VALUE) return undefined;
    return this.value;
  }

  update () {
    const newValue = this.callback(this.state);
    if (!Object.is(newValue, this.value)) {
      this.value = newValue;
      this.notify();
    }
  }
}

class PersistedValue extends SmartValue {
  constructor (defaultValue) {
    super();
    this.defaultValue = defaultValue;
  }

  init (...args) {
    super.init(...args);
    this.name = `${this.stateName}.${this.propertyName}`;
    setTimeout(() => {
      this.set(this.getInitialValue());
    });
  }

  getInitialValue () {
    const value = localStorage.getItem(`${this.stateName}-${this.name}`);
    if (value === null) {
      this.set(this.defaultValue);
      return this.defaultValue;
    }

    return JSON.parse(value).value;
  }

  get () {
    return this.value;
  }

  set (value) {
    localStorage.setItem(`${this.stateName}-${this.name}`, JSON.stringify({ value }));
    this.value = value;
    this.notify();
  }
}

const domObserver = new MutationObserver(() => {
  initializeNewElements();
});

domObserver.observe(document.body, {
  childList: true,
  subtree: true
});

function buildPath (key, path = "") {
  return path + (typeof key === "number" ? `[${key}]` : `${path.length === 0 ? '' : '.'}${key}`);
}

function deepReactiveProxy (object, getCapture, setCallback, stateName = "default", path = "") {
  return new Proxy(object, {
    get (target, key) {
      const captured = getCapture(key, path, target);
      if (captured) return captured;

      if (target[key] instanceof ComputedValue) {
        return target[key].get();
      } else if (target[key] instanceof PersistedValue) {
        return target[key].get();
      } else if (typeof target[key] === "object" && target[key] !== null) {
        return deepReactiveProxy(target[key], getCapture, setCallback, stateName, buildPath(key, path));
      } else {
        return target[key];
      }
    },

    set (target, key, value) {
      if (target[key] instanceof ComputedValue) {
        throw new Error("Cannot change the value of a computed state");
      } else if (target[key] instanceof PersistedValue) {
        target[key].set(value);
        setCallback(buildPath(key, path));
        return true;
      }

      if (value instanceof ComputedValue) {
        target[key] = value;
        reactiveComputedValues.push(value);
        value.init(target, stateName, key);
        setTimeout(() => value.update());
        return true;
      } else if (value instanceof PersistedValue) {
        target[key] = value;
        reactivePersistedValues.push(value);
        value.init(target, stateName, key);
        return true;
      }

      target[key] = value;
      setCallback(buildPath(key, path));
      return true;
    }
  });
}

function unproxify (object) {
  const unproxified = Array.isArray(object) ? [] : {};

  for (const key in object) {
    if (object[key] instanceof ComputedValue) {
      unproxified[key] = object[key].get();
    } else if (object[key] instanceof PersistedValue) {
      unproxified[key] = object[key].get();
    } else if (Array.isArray(object[key])) {
      unproxified[key] = object[key].map((value) => typeof value === "object" && value !== null ? unproxify(value) : value);
    } else if (typeof object[key] === "object" && object[key] !== null) {
      unproxified[key] = unproxify(object[key]);
    } else {
      unproxified[key] = object[key];
    }
  }

  return unproxified;
}

function reactive (...args) {
  if (!loadedOnce) {
    setTimeout(() => {
      initializeNewElements();
      loadedOnce = true;
    });
  }

  let stateName = "default";
  let initialState = {};

  if (args.length === 1 && typeof args[0] === "string") {
    stateName = args[0];
  } else if (args.length === 1 && typeof args[0] === "object") {
    initialState = args[0];
  } else if (args.length === 2) {
    stateName = args[1];
    initialState = args[0];
  }

  if (states[stateName]) return states[stateName];

  for (const key in initialState) {
    if (initialState[key] instanceof ComputedValue) {
      reactiveComputedValues.push(initialState[key]);
      initialState[key].init(initialState, stateName, key);
      setTimeout(() => initialState[key].update());
    } else if (initialState[key] instanceof PersistedValue) {
      reactivePersistedValues.push(initialState[key]);
      initialState[key].init(initialState, stateName, key);
    }
  }

  const state = deepReactiveProxy(
    initialState,
    (key, path, target) => {
      if (path === "" && key?.startsWith("$$")) {
        return target[key.slice(2)];
      } else if (path === "" && key?.startsWith("$")) {
        if (key === "$name") {
          return stateName;
        }
      }
    },
    (path) => {
      const pathRoot = path.split(".")[0].split("[")[0];
      enqueueReactive(pathRoot, stateName);
    },
    stateName
  );

  states[stateName] = state;

  setTimeout(() => initializeNewElements());

  return state;
}

function triggerReactive (dependency, stateName) {
  if (stateTemplateDependencies[stateName]) {
    const dependencies = stateTemplateDependencies[stateName][dependency] || [];
    const templateIds = dependencies.sort((a, b) => templates[b].depth - templates[a].depth);
    const focusedElement = getCssSelector(document.activeElement);
  
    for (const templateId of templateIds) {
      if (!updatedTemplates[templateId]) {
        render(templateId, stateName);
        updatedTemplates[templateId] = true;
      }
    }

    if (focusedElement) {
      const newFocusedElement = document.querySelector(focusedElement);
      if (newFocusedElement) {
        newFocusedElement.focus();
      }
    }
  }

  setTimeout(() => updateComputedValues());
  setTimeout(() => tickReactiveObservers());
}

function updateComputedValues () {
  reactiveComputedValues.forEach((computedValue) => {
    computedValue.update();
  });
}

function tickReactiveObservers () {
  reactiveObservers.forEach((observer) => {
    const callback = observer.callback;
    const valuesNow = observer.valuesFn().map((value) => typeof value === "object" ? JSON.stringify(value) : value);

    if (!observer.lastValues) {
      observer.lastValues = valuesNow;
      callback();
    } else {
      const lastValues = observer.lastValues;
      const changed = valuesNow.some((value, index) => value !== lastValues[index]);
      if (changed) {
        observer.lastValues = valuesNow;
        callback();
      }
    }
  });
}

function render (template, stateName) {
  if (templates[template].type === "binding") {
    const input = document.querySelector(`[reactive-id="${template}"]`);
    if (input) {
      input.value = getStateByPath(stateName, input.getAttribute("reactive-bind"));
      input.oninput = () => {
        setStateByPath(stateName, input.getAttribute("reactive-bind"), input.value);
      };
    }
    return;
  }

  const innerReactiveElements = document.querySelectorAll(`[reactive-id="${template}"] [reactive]`);
  const innerReactiveElementsBackup = [...innerReactiveElements].map((element) => ({
    html: element.innerHTML,
    reactiveId: element.getAttribute("reactive-id")
  }));

  try {
    const { compiledTemplate } = templates[template];
    const newHTML = compiledTemplate(getPlainState(stateName));
    const receivingElement = document.querySelector(`[reactive-id="${template}"]`);

    if (!receivingElement) {
      return;
    }

    receivingElement.innerHTML = newHTML;
  
    for (const innerReactiveElement of innerReactiveElementsBackup) {
      const newElement = document.querySelector(`[reactive-id="${innerReactiveElement.reactiveId}"]`);
      if (newElement) {
        newElement.innerHTML = innerReactiveElement.html;
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function getElementDepth (element) {
  let depth = 0;
  while (element.parentElement) {
    depth++;
    element = element.parentElement;
  }
  return depth;
}

function stripInnerReactiveElements (elementHtml) {
  const element = document.createElement("div");
  element.innerHTML = elementHtml;

  const reactiveElements = element.querySelectorAll("[reactive]");
  for (const reactiveElement of reactiveElements) {
    reactiveElement.innerHTML = "";
  }

  return element.innerHTML;
}

function getNewRandomId () {
  let randomId;

  do {
    randomId = Math.random().toString(36).slice(2);
  } while (randomId in templates);

  return randomId;
}

function setStateByPath (state, path, value) {
  return new Function("state", "value", `
    const data = reactive(state);
    data.${path} = value;
  `)(state, value);
}

function getStateByPath (state, path) {
  return new Function("state", `
    const data = reactive(state);
    return data.${path};
  `)(state);
}

function getCssSelector (element) {
  let path = [], parent;
  while (parent = element.parentNode) {
    path.unshift(`${element.tagName}:nth-child(${[].indexOf.call(parent.children, element)+1})`);
    element = parent;
  }
  return `${path.join(' > ')}`.toLowerCase();
};

function initializeNewElements () {
  if (!loadedOnce) return;

  const newElements = [
    ...document.querySelectorAll("[reactive]:not([reactive-loaded])")
  ].map((element) => ({
    element,
    depth: getElementDepth(element)
  })).sort((a, b) => b.depth - a.depth);

  for (const rawNewElement of newElements) {
    const { element: newElement, depth } = rawNewElement;
    const stateName = newElement.getAttribute("reactive") || "default";
    if (!stateTemplateDependencies[stateName]) {
      stateTemplateDependencies[stateName] = {};
    }

    const randomId = newElement.getAttribute("reactive-id") || getNewRandomId();
    newElement.setAttribute("reactive-id", randomId);

    const isBinding = newElement.hasAttribute("reactive-bind");
    if (isBinding) {
      templates[randomId] = {
        stateName,
        type: "binding",
        depth
      };

      const variable = newElement.getAttribute("reactive-bind");

      newElement.oninput = () => {
        setStateByPath(stateName, variable, newElement.value);
      };

      const value = getStateByPath(stateName, variable);
      newElement.value = value;

      if (!stateTemplateDependencies[stateName][variable]) {
        stateTemplateDependencies[stateName][variable] = [];
      }

      stateTemplateDependencies[stateName][variable].push(randomId);
    } else {
      newElement.setAttribute("reactive-loaded", "");
      const elementHtml = stripInnerReactiveElements(newElement.innerHTML);
      const template = compile(elementHtml);
      templates[randomId] = {
        type: "element",
        depth,
        compiledTemplate: template,
        stateName
      };

      for (const variable of template.variables) {
        if (!stateTemplateDependencies[stateName][variable]) {
          stateTemplateDependencies[stateName][variable] = [];
        }

        stateTemplateDependencies[stateName][variable].push(randomId);
      }

      render(randomId, stateName);
    }
  }
}

function observe (callback, valuesFn, initialCall = true) {
  const observer = {
    callback,
    valuesFn
  };

  if (initialCall) {
    callback();
    observer.lastValues = valuesFn().map((value) => typeof value === "object" ? JSON.stringify(value) : value);;
  }

  reactiveObservers.push(observer);
}

function getPlainState (state = "default") {
  if (typeof state === "string") {
    return unproxify(states[state]);
  } else if (typeof state === "object") {
    return unproxify(state);
  }

  throw new Error("Invalid state");
}

function computed (valueFn) {
  return new ComputedValue(valueFn);
}

function persisted (defaultValue) {
  return new PersistedValue(defaultValue);
}

function reset () {
  for (const stateName in states) {
    delete states[stateName];
  }

  for (const templateId in templates) {
    delete templates[templateId];
  }

  for (const stateName in stateTemplateDependencies) {
    delete stateTemplateDependencies[stateName];
  }

  reactiveObservers.splice(0);
  reactiveComputedValues.splice(0);
  reactivePersistedValues.splice(0);

  clearReactiveQueue();
}

export { reactive, observe, getPlainState, computed, persisted, reset };

if (window) {
  window.reactive = function (...args) {
    return reactive(...args);
  };
  
  window.reactive.observe = observe;
  window.reactive.getPlainState = getPlainState;
  window.reactive.computed = computed;
  window.reactive.persisted = persisted;
  window.reactive.reset = reset;
}
