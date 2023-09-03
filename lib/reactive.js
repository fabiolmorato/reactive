import { compile } from "./brackets-js/index.js";

// all of the reactive states in the application
const states = {};

// all of the compiled templates in the application
const templates = {};

// all the root dependencies of the templates
// if a template uses a variable "foo.bar.baz", then the root dependency is "foo"
// this is used to trigger reactivity when a root dependency changes
const stateTemplateDependencies = {};

const reactiveObservers = [];

let loadedOnce = false;

// reactive state type
class ComputedValue {
  constructor (callback) {
    this.callback = callback;
    this.update();
  }

  get () {
    return this.value;
  }

  update () {
    this.value = this.callback();
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

function deepReactiveProxy (object, getCapture, setCallback, path = "") {
  return new Proxy(object, {
    get (target, key) {
      const captured = getCapture(key, path);
      if (captured) return captured;

      if (target[key] instanceof ComputedValue) {
        return target[key].get();
      } else if (typeof target[key] === "object" && target[key] !== null) {
        return deepReactiveProxy(target[key], getCapture, setCallback, buildPath(key, path));
      } else {
        return target[key];
      }
    },

    set (target, key, value) {
      if (target[key] instanceof ComputedValue) {
        throw new Error("Cannot change the value of a computed state");
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
    initializeNewElements();
    loadedOnce = true;
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

  const state = deepReactiveProxy(
    initialState,
    (key, path) => {
      // if (path === "" && key === "$observe") {
      //   return (callback, valuesFn, initialCall = true) => observe(stateName, callback, valuesFn, initialCall);
      // }
    },
    (path) => {
      const pathRoot = path.split(".")[0].split("[")[0];
      triggerReactive(pathRoot, stateName);
    }
  );

  states[stateName] = state;

  setTimeout(() => initializeNewElements());

  return state;
}

function triggerReactive (dependency, stateName) {
  const templateIds = [
    ...stateTemplateDependencies[stateName][dependency]
  ].sort((a, b) => templates[b].depth - templates[a].depth);
  const focusedElement = getCssSelector(document.activeElement);

  for (const templateId of templateIds) {
    render(templateId, stateName);
  }

  if (focusedElement) {
    const newFocusedElement = document.querySelector(focusedElement);
    if (newFocusedElement) {
      newFocusedElement.focus();
    }
  }

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
    input.value = getStateByPath(stateName, input.getAttribute("reactive-bind"));
    input.oninput = () => {
      setStateByPath(stateName, input.getAttribute("reactive-bind"), input.value);
    };
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
    receivingElement.innerHTML = newHTML;
  
    for (const innerReactiveElement of innerReactiveElementsBackup) {
      const newElement = document.querySelector(`[reactive-id="${innerReactiveElement.reactiveId}"]`);
      newElement.innerHTML = innerReactiveElement.html;
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
    const data = states[state];
    data.${path} = value;
  `)(state, value);
}

function getStateByPath (state, path) {
  return new Function("state", `
    const data = reactive(state);
    data.${path};
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
        compiledTemplate: template
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

export { reactive, observe, getPlainState };

if (window) {
  window.reactive = function (...args) {
    return reactive(...args);
  };
  
  window.reactive.observe = observe;
  window.reactive.getPlainState = getPlainState;
}
