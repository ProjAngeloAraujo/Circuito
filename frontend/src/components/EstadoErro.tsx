interface EstadoErroProps {
  mensagem: string;
  onTentarNovamente: () => void;
}

export function EstadoErro({ mensagem, onTentarNovamente }: EstadoErroProps) {
  return (
    <div className="estado-erro" role="alert">
      <p>{mensagem}</p>
      <button type="button" onClick={onTentarNovamente}>
        Tentar de novo
      </button>
    </div>
  );
}
