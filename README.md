# reactive

This is an educational library. Working in education I noticed that many people find it hard to suddenly start using a front-end framework because you delegate control to the library with a somewhat different syntax.

This library is inspired by my experience with Vue 2 and AngularJS and implements a templating language inspired by Handlebars.

Currently it has no optimizations and will replace the DOM subtree entirely upon a state change.

### Example

The idea behind this was to have a JS framework that allows this to work:

```html
<div reactive>
  You clicked {{count}} times!
  {{#if didUserClickALot}}
  Wow so many clicks
  {{/if}}
  <button onclick="increment()">Click me</button>
</div>

<div reactive>
  <input type="text" reactive reactive-bind="stuffTyped" placeholder="type something..." />
  <div>{{stuffTyped ? `You typed "${stuffTyped}"` : 'Type something up there :)'}}</div>
</div>

<div reactive>
  <input type="text" reactive reactive-bind="yourPersistedName" placeholder="type something..." />
  <div>{{yourPersistedName ? `Your name is "${yourPersistedName}"` : 'Write your name up and refresh this page :)'}}</div>
</div>

<script>
  const state = reactive({
    count: 0,
    didUserClickALot: reactive.computed((state) => state.count > 10),
    stuffTyped: "",
    yourPersistedName: reactive.persisted("")
  });

  reactive.observe(() => {
    if (state.count > 15) {
      alert("Okay calm down!");
    }
  }, () => [state.count]);

  function increment () {
    state.count++;
  }
</script>
```

You can also have multiple reactive states:

```html
<div reactive> <!-- uses default state -->
  {{something}}
</div>

<div reactive="state2">
  {{something}}
</div>

<script>
  const state = reactive({
    something: "Seomthing from default state"
  });

  const state2 = reactive({
    something: "Seomthing from default state"
  }, "state2");
</script>
```
