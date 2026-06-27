import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  template: `
    <div class="admin-login-page">
      <div class="login-card">
        <div class="login-header">
          <h1>Admin Login</h1>
          <p>Đăng nhập vào khu vực quản trị bằng Firebase</p>
        </div>

        @if (errorMessage()) {
          <div class="alert alert-danger">{{ errorMessage() }}</div>
        }

        <form (ngSubmit)="submit()" #formRef="ngForm">
          <label>Email</label>
          <input name="email" [(ngModel)]="email" type="email" required />

          <label>Password</label>
          <input name="password" [(ngModel)]="password" type="password" required minlength="6" />

          <button type="submit" [disabled]="formRef.invalid || adminAuth.isLoading()">
            @if (!adminAuth.isLoading()) { Đăng nhập }
            @if (adminAuth.isLoading()) { Đang xử lý... }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .admin-login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #f0f7ef 0%, #e8f1ff 100%);
      padding: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      background: #fff;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.16);
    }

    .login-header h1 {
      margin: 0 0 8px;
      font-size: 1.8rem;
    }

    .login-header p {
      margin: 0 0 20px;
      color: #64748b;
    }

    form {
      display: grid;
      gap: 12px;
    }

    label {
      font-weight: 600;
    }

    input {
      width: 100%;
      height: 48px;
      border: 1px solid #dbe3ef;
      border-radius: 12px;
      padding: 0 14px;
    }

    button {
      margin-top: 8px;
      height: 48px;
      border: 0;
      border-radius: 12px;
      background: #111827;
      color: #fff;
      font-weight: 600;
    }

    .alert {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #fef2f2;
      color: #b91c1c;
    }
  `]
})
export class AdminLoginComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly adminAuth = inject(AdminAuthService);

  email = '';
  password = '';

  errorMessage() {
    return this.adminAuth.error();
  }

  ngOnInit(): void {
    if (this.adminAuth.isAuthenticated() && this.adminAuth.currentUser()?.role === 'admin') {
      void this.router.navigate(['/admin']);
    }
  }

  submit(): void {
    this.adminAuth.signIn(this.email.trim(), this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        // Error is exposed by the service signal.
      }
    });
  }
}