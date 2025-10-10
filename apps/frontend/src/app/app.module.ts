import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule, MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { AppComponent } from './app.component';
import { WorkHoursComponent } from './components/work-hours/work-hours.component';
import { LoginFormComponent } from './components/login-form/login-form.component';
import { SwipeDataComponent } from './components/swipe-data/swipe-data.component';
import { StatsCardComponent } from './components/stats-card/stats-card.component';

import { WorkHoursService } from './services/work-hours.service';
import { WorkHoursDirectService } from './services/work-hours-direct.service';
import { AuthService } from './services/auth.service';
import { GreytHRService } from './services/greythr.service';
import { DATE_FORMAT_PROVIDER, CUSTOM_DATE_ADAPTER_PROVIDER } from './config/date-format';
import { CalendarComponent } from './components/calendar/calendar.component';
import { ThemeSwitcherComponent } from './components/theme-switcher/theme-switcher.component';
import { GreytHRAuthComponent } from './components/greythr-auth/greythr-auth.component';

@NgModule({
  declarations: [
    AppComponent,
    WorkHoursComponent,
    LoginFormComponent,
    SwipeDataComponent,
    StatsCardComponent,
    CalendarComponent,
    ThemeSwitcherComponent,
    GreytHRAuthComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    
    // Angular Material
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatButtonToggleModule
  ],
  providers: [
    WorkHoursService,
    WorkHoursDirectService,
    AuthService,
    GreytHRService,
    DATE_FORMAT_PROVIDER,
    CUSTOM_DATE_ADAPTER_PROVIDER,
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
