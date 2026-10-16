interface Props {
  tipo: 'bien' | 'mal' | 'info';
  texto: string;
  hablando: boolean;
  nombre?: string;
  onRepeat?: () => void;
}

export default function BotMessage({ tipo, texto, hablando, nombre, onRepeat }: Props) {
  return (
    <div className={`bot-container bot-${tipo}`} aria-live="polite">
      <div className={`bot-avatar ${hablando ? 'talking' : ''}`}>
        🦉
        {hablando && <span className="bot-mouth">●</span>}
      </div>
      <div className="bot-bubble">
        {nombre && <div className="bot-name">Léo dice a {nombre}:</div>}
        <div className="bot-text">{texto}</div>
      </div>
      {onRepeat && (
        <button className="btn-escuchar-grande" onClick={onRepeat} aria-label="Escuchar de nuevo" title="Escuchar de nuevo">
          🔊
        </button>
      )}
    </div>
  );
}
