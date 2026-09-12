// Envuelve un handler async para que sus rechazos de promesa lleguen al
// middleware de manejo de errores de Express (que no los captura solo).
export function ah(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
