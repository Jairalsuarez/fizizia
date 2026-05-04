export function ProjectTypeCard({ icon, label, desc, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer flex flex-col items-start text-left p-4 rounded-xl border transition-all min-h-[140px] ${
        isSelected
          ? 'border-fizzia-500 bg-fizzia-500/10'
          : 'border-dark-700 bg-dark-900/50 hover:border-dark-600'
      }`}
    >
      <span className={`material-symbols-rounded text-2xl mb-2 ${
        isSelected ? 'text-fizzia-400' : 'text-dark-400'
      }`}>{icon}</span>
      <p className="text-white text-sm font-medium leading-snug mb-1">{label}</p>
      <p className="text-dark-500 text-xs leading-snug line-clamp-2">{desc}</p>
    </button>
  )
}
