import { AccountSettingsPage } from '../../features/settings/AccountSettingsPage'

export function SettingsPage() {
  return (
    <AccountSettingsPage
      fallbackName="Developer"
      theme="rose"
      notifications={[
        'Se actualice un proyecto asignado',
        'El admin te asigne un nuevo proyecto',
        'Recibas un mensaje del equipo',
        'Se registre un nuevo pago',
      ]}
    />
  )
}
