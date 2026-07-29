/**
 * Shared ECharts theme, built from ./tokens.js. Registered once at app startup
 * (main.jsx). Any chart can opt in with <ReactECharts theme="kpiDark" | "kpiLight" />
 * instead of re-deriving textColor/subColor/axisColor/splitColor locally.
 */
import * as echarts from 'echarts/core';
import { chartTokens, CHART_PALETTE } from './tokens';

export const DARK_THEME_NAME = 'kpiDark';
export const LIGHT_THEME_NAME = 'kpiLight';

function buildTheme(isDark) {
  const { text, sub, axis, split, track } = chartTokens(isDark);
  return {
    color: CHART_PALETTE,
    backgroundColor: 'transparent',
    textStyle: { color: text },
    categoryAxis: {
      axisLine: { lineStyle: { color: axis } },
      axisTick: { show: false },
      axisLabel: { color: sub },
      splitLine: { lineStyle: { color: split } },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: sub },
      splitLine: { lineStyle: { color: split } },
    },
    gauge: {
      axisLine: { lineStyle: { color: [[1, track]] } },
      detail: { color: text },
    },
  };
}

export function registerEchartsThemes() {
  echarts.registerTheme(DARK_THEME_NAME, buildTheme(true));
  echarts.registerTheme(LIGHT_THEME_NAME, buildTheme(false));
}

export function echartsThemeName(isDark) {
  return isDark ? DARK_THEME_NAME : LIGHT_THEME_NAME;
}
