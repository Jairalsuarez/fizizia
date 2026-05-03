import { Icon } from './Icon';

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <Icon name={icon} className="text-4xl text-dark-400 mb-4" size={40} />}
      <h3 className="text-lg font-semibold text-dark-200 mb-2">{title}</h3>
      {description && <p className="text-dark-400 mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
