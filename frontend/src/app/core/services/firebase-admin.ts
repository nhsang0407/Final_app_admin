import { environment } from '@environments/environment';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export function hasFirebaseConfig(): boolean {
  const config = environment.firebase as FirebaseConfig | undefined;
  return !!config?.apiKey && !!config?.authDomain && !!config?.databaseURL && !!config?.projectId;
}

function getFirebaseConfig(): FirebaseConfig {
  const config = environment.firebase as FirebaseConfig | undefined;
  if (!config) {
    throw new Error('Firebase configuration is missing');
  }

  return config;
}

export function getFirebaseApp(): FirebaseApp {
  const config = getFirebaseConfig();
  if (!getApps().length) {
    return initializeApp(config);
  }

  return getApp();
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Database {
  return getDatabase(getFirebaseApp());
}