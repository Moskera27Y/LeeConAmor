import { ABECEDARIO, VOCALES, dominio, type EstadoMotor } from '../data/motorNiveles';

// Mapa de dominio por letra para que el padre decida la graduación.
export default function MapaDominio({ motor }: { motor: EstadoMotor }) {
  const letras = [...VOCALES, ...ABECEDARIO.filter((l) => !VOCALES.includes(l))];
  const color = (l: string) => {
    const d = dominio(motor, l);
    const total = (motor.aciertos[l] || 0) + (motor.pesos[l] || 0);
    if (total === 0) return 'dom-0';
    if (d >= 80) return 'dom-ok';
    if (d >= 50) return 'dom-mid';
    return 'dom-low';
  };
  return (
    <div className="mapa-dominio">
      <h3>🗺️ Dominio por letra</h3>
      <div className="dom-grid">
        {letras.map((l) => (
          <span key={l} className={`dom-letra ${color(l)}`} title={`${l}: ${dominio(motor, l)}%`}>
            {l}
          </span>
        ))}
      </div>
      <div className="dom-leyenda">
        <span><i className="dom-letra dom-ok">■</i> dominada</span>
        <span><i className="dom-letra dom-mid">■</i> en proceso</span>
        <span><i className="dom-letra dom-low">■</i> cuesta</span>
        <span><i className="dom-letra dom-0">■</i> sin practicar</span>
      </div>
    </div>
  );
}
