import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { User, UserRole } from '../../../core/models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, EmptyState],
  templateUrl: './admin-users.html',
})
export class AdminUsers implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  users = signal<User[]>([]);
  search = '';

  ngOnInit() { this.load(); }

  load() {
    this.adminService.listUsers({ q: this.search || undefined }).subscribe((res) => this.users.set(res.users));
  }

  toggleStatus(user: User) {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    this.adminService.setUserStatus(user.id, nextStatus).subscribe(() => { this.toast.success('User status updated'); this.load(); });
  }

  setRole(user: User, role: UserRole) {
    this.adminService.setUserRole(user.id, role).subscribe(() => { this.toast.success('Role updated'); this.load(); });
  }
}
