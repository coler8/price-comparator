import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  fallingItems = Array.from({ length: 25 }).map((_, i) => ({
    emoji: ['🍎', '🥦', '🧀', '🍞', '🥛', '🥩', '🥚', '🍕', '🍏', '🥯', '🥬', '🍄'][Math.floor(Math.random() * 12)],
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 12 + Math.random() * 15,
    size: 18 + Math.random() * 20
  }));

  constructor() { }
}

