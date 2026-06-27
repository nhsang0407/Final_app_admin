export const environment = {
  production: false,
  // Use relative path for proxy mode, or full URL for direct mode
  // With proxy.conf.json, requests to /api will be forwarded to backend
  apiUrl: '/api/v1',
  apiTimeout: 30000,
  appName: 'Ponsai',
  version: '2.0.0',
  // Google Maps API key for shipping distance calculation
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY_HERE',
  firebase: {
    apiKey: 'AIzaSyA-LPHndNnjUYNHXLxft-2kv3Uh-VfzgyY',
    authDomain: 'finalapp-c65a2.firebaseapp.com',
    databaseURL: 'https://finalapp-c65a2-default-rtdb.firebaseio.com',
    projectId: 'finalapp-c65a2',
    storageBucket: 'finalapp-c65a2.firebasestorage.app',
    messagingSenderId: '14500134731',
    appId: '1:14500134731:web:ef81ef094014e98910b2ce',
    measurementId: 'G-GN90S76TXY'
  }
};

