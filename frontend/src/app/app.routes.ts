import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  { path: 'auth/login', loadComponent: () => import('./features/auth/login/login').then((m) => m.Login) },

  { path: 'sports', loadComponent: () => import('./features/sports/sports').then((m) => m.Sports) },
  { path: 'academic', loadComponent: () => import('./features/academic/academic').then((m) => m.Academic) },
  { path: 'esports', loadComponent: () => import('./features/esports/esports').then((m) => m.Esports) },
  { path: 'competitions', loadComponent: () => import('./features/competitions/explore/explore').then((m) => m.Explore) },
  {
    path: 'competitions/:id',
    loadComponent: () => import('./features/competitions/details/competition-details').then((m) => m.CompetitionDetails),
  },
  {
    path: 'organizations/:id',
    loadComponent: () => import('./features/competitions/organization-profile/organization-profile').then((m) => m.OrganizationProfile),
  },

  { path: 'find-team', loadComponent: () => import('./features/find-team/find-team').then((m) => m.FindTeam) },
  { path: 'teams/:id', loadComponent: () => import('./features/teams/team-detail/team-detail').then((m) => m.TeamDetail) },

  { path: 'organize', loadComponent: () => import('./features/organizer-dashboard/organize/organize').then((m) => m.Organize) },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/participant-dashboard/participant-dashboard').then((m) => m.ParticipantDashboard),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notifications/notifications').then((m) => m.Notifications),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/profile/profile').then((m) => m.Profile),
  },

  {
    path: 'organizer',
    canActivate: [roleGuard('organizer', 'admin')],
    loadComponent: () => import('./features/organizer-dashboard/organizer-shell/organizer-shell').then((m) => m.OrganizerShell),
    children: [
      { path: '', loadComponent: () => import('./features/organizer-dashboard/overview/organizer-overview').then((m) => m.OrganizerOverview) },
      { path: 'competitions', loadComponent: () => import('./features/organizer-dashboard/competitions-list/organizer-competitions').then((m) => m.OrganizerCompetitions) },
      { path: 'competitions/new', loadComponent: () => import('./features/organizer-dashboard/create-competition/create-competition').then((m) => m.CreateCompetition) },
      { path: 'competitions/:id/manage', loadComponent: () => import('./features/organizer-dashboard/manage-competition/manage-competition').then((m) => m.ManageCompetition) },
      { path: 'settings', loadComponent: () => import('./features/organizer-dashboard/settings/organizer-settings').then((m) => m.OrganizerSettings) },
    ],
  },

  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./features/admin-dashboard/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', loadComponent: () => import('./features/admin-dashboard/overview/admin-overview').then((m) => m.AdminOverview) },
      { path: 'users', loadComponent: () => import('./features/admin-dashboard/users/admin-users').then((m) => m.AdminUsers) },
      { path: 'organizations', loadComponent: () => import('./features/admin-dashboard/organizations/admin-organizations').then((m) => m.AdminOrganizations) },
      { path: 'competitions', loadComponent: () => import('./features/admin-dashboard/competitions/admin-competitions').then((m) => m.AdminCompetitions) },
      { path: 'reports', loadComponent: () => import('./features/admin-dashboard/reports/admin-reports').then((m) => m.AdminReports) },
    ],
  },

  { path: '**', loadComponent: () => import('./shared/components/not-found/not-found').then((m) => m.NotFound) },
];
