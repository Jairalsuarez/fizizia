import { AccountSettingsPage } from '../../features/settings/AccountSettingsPage'

export function SettingsPage() {
  return (
    <AccountSettingsPage
      fallbackName="Usuario"
      notifications={[
        'Se actualice el estado de tu proyecto',
        'Se agregue un nuevo archivo a tu proyecto',
        'Recibas un mensaje del equipo',
        'Se genere una nueva factura',
      ]}
    />
  )
}
