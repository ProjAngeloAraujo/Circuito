interface BarraProgressoProps {
  respondidas: number;
  total: number;
}

export function BarraProgresso({ respondidas, total }: BarraProgressoProps) {
  const percentual = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  return (
    <div className="barra-progresso-container">
      <div
        className="barra-progresso"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={respondidas}
        aria-label="Progresso da triagem"
      >
        <div className="barra-progresso-preenchida" style={{ width: `${percentual}%` }} />
      </div>
      <span className="barra-progresso-texto">
        {respondidas} de {total} perguntas respondidas
      </span>
    </div>
  );
}
