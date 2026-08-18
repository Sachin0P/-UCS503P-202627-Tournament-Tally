import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';

declare const google: any;

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

@Component({
  selector: 'app-google-signin-button',
  standalone: true,
  template: `<div #buttonContainer></div>`,
})
export class GoogleSigninButton implements OnInit {
  @Output() credential = new EventEmitter<string>();
  @ViewChild('buttonContainer', { static: true }) buttonContainer!: ElementRef<HTMLDivElement>;

  async ngOnInit() {
    await loadGoogleScript();
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => this.credential.emit(response.credential),
    });
    google.accounts.id.renderButton(this.buttonContainer.nativeElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
    });
  }
}
