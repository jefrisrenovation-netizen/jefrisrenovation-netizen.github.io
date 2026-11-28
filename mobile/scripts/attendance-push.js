function setupAttendancePush() {
  if (Capacitor.getPlatform() !== 'ios' || document.getElementById('attendancePush')) return;
  const button = document.createElement('button');
  button.id = 'attendancePush';
  button.type = 'button';
  button.className = 'secondary no-print';
  const status = document.createElement('p');
  status.className = 'muted no-print';
  status.setAttribute('role', 'status');
  const owner = user.id;
  const storageKey = 'suivi_attendance_push_' + owner;
  const language = $('languageCode').value;
  const labels = language.startsWith('pt')
    ? ['Ativar avisos de ponto', 'Desativar avisos de ponto', 'Permita as notificações nos Ajustes do iPhone.', 'Não foi possível configurar os avisos.']
    : language === 'en'
      ? ['Enable attendance alerts', 'Disable attendance alerts', 'Allow notifications in iPhone Settings.', 'Could not configure attendance alerts.']
      : ['Activer les alertes de pointage', 'Désactiver les alertes de pointage', 'Autorisez les notifications dans les réglages de l’iPhone.', 'Impossible de configurer les alertes.'];
  const updateLabel = () => { button.textContent = labels[localStorage.getItem(storageKey) ? 1 : 0]; };
  updateLabel();
  $('settingsPanel').append(button, status);

  let pending = false;
  let registrationTimeout;
  async function configureToken(token, enabled) {
    const { error } = await sb.rpc('set_attendance_push_device', { device_token: token, enabled });
    if (error) throw error;
  }

  async function connect() {
    await PushNotifications.addListener('registration', async ({ value }) => {
      if (!pending || user?.id !== owner) return;
      pending = false;
      clearTimeout(registrationTimeout);
      try {
        const token = value.toLowerCase();
        await configureToken(token, true);
        localStorage.setItem(storageKey, token);
        updateLabel();
      } catch {
        status.textContent = labels[3];
      } finally {
        button.disabled = false;
      }
    });
    await PushNotifications.addListener('registrationError', () => {
      if (!pending) return;
      pending = false;
      clearTimeout(registrationTimeout);
      button.disabled = false;
      status.textContent = labels[3];
    });
  }

  let listeners;
  button.onclick = async () => {
    button.disabled = true;
    status.textContent = '';
    try {
      const token = localStorage.getItem(storageKey);
      if (token) {
        await configureToken(token, false);
        localStorage.removeItem(storageKey);
        updateLabel();
        return;
      }
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        status.textContent = labels[2];
        return;
      }
      listeners ??= connect();
      await listeners;
      pending = true;
      registrationTimeout = setTimeout(() => {
        pending = false;
        button.disabled = false;
        status.textContent = labels[3];
      }, 15000);
      await PushNotifications.register();
    } catch {
      pending = false;
      clearTimeout(registrationTimeout);
      status.textContent = labels[3];
    } finally {
      if (!pending) button.disabled = false;
    }
  };
}
