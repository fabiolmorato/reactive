export function* Enum () {
  while (true) {
    yield Symbol();
  }
}

Enum.number = function* () {
  let i = 0;
  while (true) yield i++;
}

Enum.object = function (...props) {
  const obj = {};
  for (let prop of props) obj[prop] = prop;
  return obj;
}
