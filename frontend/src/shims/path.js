export function dirname() {
  return "";
}

export function basename() {
  return "";
}

export function extname() {
  return "";
}

export function join(...segments) {
  return segments.filter(Boolean).join("/");
}

export function resolve(...segments) {
  return join(...segments);
}

export default {
  dirname,
  basename,
  extname,
  join,
  resolve,
};
