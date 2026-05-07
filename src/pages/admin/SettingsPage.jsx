import { AccountSettingsPage } from '../../features/settings/AccountSettingsPage'

export function SettingsPage() {
  return (
    <AccountSettingsPage
      fallbackName="Admin"
      notifications={[
        'Se actualice el estado de un proyecto',
        'Se registre un nuevo cliente o lead',
        'Se genere un nuevo pago o factura',
        'Un desarrollador envie un mensaje',
      ]}
    />
  )
}
