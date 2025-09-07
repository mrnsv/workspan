import { MAT_DATE_FORMATS } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter } from '@angular/material/core';
import { Injectable } from '@angular/core';
import * as moment from 'moment';

export const DD_MM_YYYY_Format = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Injectable()
export class CustomMomentDateAdapter extends MomentDateAdapter {
  constructor() {
    super('en-US');
    // Configure moment to use Sunday as first day of week
    moment.locale('en-US', {
      week: {
        dow: 0, // Sunday is the first day of the week
        doy: 6  // The week that contains Jan 1st is the first week of the year
      }
    });
  }

  getFirstDayOfWeek(): number {
    return 0; // 0 = Sunday, 1 = Monday, etc.
  }
}

export const DATE_FORMAT_PROVIDER = {
  provide: MAT_DATE_FORMATS,
  useValue: DD_MM_YYYY_Format
};

export const CUSTOM_DATE_ADAPTER_PROVIDER = {
  provide: DateAdapter,
  useClass: CustomMomentDateAdapter
};
