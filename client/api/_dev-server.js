// Solo para desarrollo local: corre la misma app de Express como servidor
// tradicional. En Vercel, [...path].js expone la app directamente como
// funcion serverless — este archivo no se usa ahi (por eso el prefijo "_").
import app from './_lib/app.js';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API de fidelización escuchando en http://localhost:${PORT}`);
});
