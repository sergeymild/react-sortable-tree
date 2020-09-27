/* eslint-disable import/no-extraneous-dependencies */

import { storiesOf } from '@storybook/react';
import React from 'react';
import BarebonesExample from './barebones';

storiesOf('Basics', module)
  .add('Minimal implementation', () => <BarebonesExample />)