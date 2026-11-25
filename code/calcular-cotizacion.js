// Nodo "Code" de n8n (modo: Run Once for All Items · lenguaje: JavaScript)
// Recibe los datos que extrajo la IA, valida que estén completos y calcula la cotización.
// La IA solo extrae información del texto; los cálculos y las reglas de negocio se hacen acá.

// Tarifas ficticias en USD por kg, según modalidad
const tarifas = { aereo: 9, maritimo: 2.5, courier: 14 };
const MINIMO = 50; // cobro mínimo en USD

// Datos originales del formulario (nombre, email y pedido del cliente)
const formularios = $('On form submission').all();

return $input.all().map((item, i) => {
  const d = item.json.output;        // datos extraídos por la IA
  const form = formularios[i].json;  // datos escritos por el cliente

  // Peso total calculado por código (no por la IA)
  const peso_kg = d.peso_total_kg > 0
    ? d.peso_total_kg
    : (d.bultos || 1) * (d.peso_por_bulto_kg || 0);

  // Validación propia de los datos obligatorios
  const faltan = [];
  if (!d.origen) faltan.push('origen');
  if (!d.destino) faltan.push('destino');
  if (peso_kg <= 0) faltan.push('peso');
  if (!tarifas[d.modalidad]) faltan.push('modalidad (aéreo, marítimo o courier)');

  const completo = faltan.length === 0;
  const tarifa = tarifas[d.modalidad] ?? 0;
  const total = completo ? Math.max(peso_kg * tarifa, MINIMO) : 0;

  return {
    json: {
      fecha: $now.toFormat('dd/MM/yyyy HH:mm'),
      nombre: form['Nombre'],
      email: form['Email'],
      pedido: form['Pedido'],
      ...d,
      peso_kg,
      completo,
      faltan,
      tarifa_usd_kg: tarifa,
      total_usd: Math.round(total * 100) / 100,
    },
  };
});
