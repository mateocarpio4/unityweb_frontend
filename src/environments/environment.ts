const apiHost = typeof window === 'undefined' ? 'localhost' : window.location.hostname;

export const environment = {
  production: false,
  apiUrl: `http://${apiHost}:8080/api`,
};
