import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, from, map, switchMap, tap, throwError } from 'rxjs';
import { get, ref } from 'firebase/database';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { AdminUser } from '../models/admin.models';
import { getFirebaseAuth, getFirebaseDb, hasFirebaseConfig } from '@core/services/firebase-admin';

export interface AdminLoginResponse {
  success: boolean;
  data: AdminUser;
  token?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private readonly tokenKey = 'ponsai_admin_token';
  private readonly currentAdminSubject = new BehaviorSubject<AdminUser | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _isInitialized = signal(false);

  readonly currentUser$ = this.currentAdminSubject.asObservable();
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());

  constructor(private router: Router) {
    this.initializeAuthState();
  }

  currentUser(): AdminUser | null {
    return this.currentAdminSubject.getValue();
  }

  isAuthenticated(): boolean {
    return !!this.currentAdminSubject.getValue();
  }

  isInitialized(): boolean {
    return this._isInitialized();
  }

  signIn(email: string, password: string): Observable<AdminLoginResponse> {
    if (!hasFirebaseConfig()) {
      return throwError(() => new Error('Firebase configuration is missing.'));
    }

    this._isLoading.set(true);
    this._error.set(null);

    return from(signInWithEmailAndPassword(getFirebaseAuth(), email, password)).pipe(
      switchMap(({ user }) => this.loadAdminProfile(user)),
      tap({
        next: (adminUser) => {
          this.currentAdminSubject.next(adminUser);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.tokenKey, adminUser._id);
          }
          this._isLoading.set(false);
          this._isInitialized.set(true);
        },
        error: (err) => {
          this._isLoading.set(false);
          this._error.set(err?.message || 'Đăng nhập admin thất bại');
        }
      }),
      map((adminUser) => ({
        success: true,
        data: adminUser,
        token: adminUser._id,
        message: 'Đăng nhập thành công'
      })),
      catchError((error) => {
        this.currentAdminSubject.next(null);
        this._isLoading.set(false);
        this._isInitialized.set(true);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.currentAdminSubject.next(null);
    this._error.set(null);
    this._isInitialized.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
    }

    if (hasFirebaseConfig()) {
      void signOut(getFirebaseAuth()).catch(() => undefined);
    }

    this.router.navigate(['/admin/login']);
  }

  clearError(): void {
    this._error.set(null);
  }

  private initializeAuthState(): void {
    if (!hasFirebaseConfig()) {
      this._isInitialized.set(true);
      return;
    }

    onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (!firebaseUser) {
        this.currentAdminSubject.next(null);
        this._isInitialized.set(true);
        return;
      }

      try {
        const adminUser = await this.resolveAdminProfile(firebaseUser);
        this.currentAdminSubject.next(adminUser);
      } catch {
        this.currentAdminSubject.next(null);
        await signOut(getFirebaseAuth()).catch(() => undefined);
      } finally {
        this._isInitialized.set(true);
      }
    });
  }

  private loadAdminProfile(firebaseUser: FirebaseUser): Observable<AdminUser> {
    return from(this.resolveAdminProfile(firebaseUser));
  }

  private async resolveAdminProfile(firebaseUser: FirebaseUser): Promise<AdminUser> {
    if (!hasFirebaseConfig()) {
      throw new Error('Firebase configuration is missing.');
    }

    const db = getFirebaseDb();
    const [userSnapshot, adminSnapshot] = await Promise.all([
      get(ref(db, `users/${firebaseUser.uid}`)),
      get(ref(db, `admins/${firebaseUser.uid}`))
    ]);

    const userProfile = userSnapshot.val();
    const adminProfile = adminSnapshot.val();
    const profile = userProfile?.role === 'admin' ? userProfile : adminProfile;

    if (!profile || profile.role !== 'admin') {
      throw new Error('Tài khoản này chưa được cấp quyền admin.');
    }

    const adminUser: AdminUser = {
      _id: profile._id || firebaseUser.uid,
      name: profile.name || firebaseUser.displayName || 'Admin',
      email: profile.email || firebaseUser.email || '',
      phone: profile.phone,
      role: 'admin',
      isActive: profile.isActive !== false,
      isEmailVerified: profile.isEmailVerified ?? firebaseUser.emailVerified ?? true,
      authProvider: profile.authProvider || 'google',
      avatar: profile.avatar,
      address: profile.address,
      orderCount: Number(profile.orderCount || 0),
      totalSpent: Number(profile.totalSpent || 0),
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || new Date().toISOString()
    };

    return adminUser;
  }
}