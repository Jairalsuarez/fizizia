export function Input({ label, type = 'text', value, onChange, placeholder, required = false, error, className = '', name, autoFocus = false }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="block text-sm font-medium text-dark-200">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        name={name}
        autoFocus={autoFocus}
        className="w-full bg-dark-950 border border-dark-700 rounded-lg px-4 py-2.5 text-white focus:border-fizzia-400 focus:ring-1 focus:ring-fizzia-400 outline-none placeholder:text-dark-400"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
