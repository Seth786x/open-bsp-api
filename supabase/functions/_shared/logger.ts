const levelColor = {
  info: "blue",
  warn: "yellow",
  error: "red"
};
function log(level, message, details) {
  const color = levelColor[level];
  if (typeof details === "string") {
    console[level](`%c${message}\n%c${details}`, `color: ${color}`, `color: ${color}; font-weight: bold`);
  } else if (details != null) {
    console[level](`%c${message}\n`, `color: ${color}`, details);
  } else {
    console[level](`%c${message}`, `color: ${color}`);
  }
}
export function info(message, details) {
  log("info", message, details);
}
export function warn(message, details) {
  log("warn", message, details);
}
export function error(message, details) {
  log("error", message, details);
}
