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
  const categoryAxis = {
    axisLine: { lineStyle: { color: axis } },
    axisTick: { show: false },
    axisLabel: { color: sub },
    splitLine: { lineStyle: { color: split } },
  };
  const valueAxis = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: sub },
    splitLine: { lineStyle: { color: split } },
  };
  return {
    color: CHART_PALETTE,
    backgroundColor: 'transparent',
    textStyle: { color: text },
    categoryAxis,
    valueAxis,
    // Time/log axes take their own theme keys — without these, a date x-axis fell back to the
    // main text color instead of the softer axis-label one used by every other axis.
    timeAxis: categoryAxis,
    logAxis: valueAxis,
    // Mode-matched tooltip (ECharts' default is always a white box, even in dark mode). Same
    // card surface as surfaceBg() in DashboardBuilder/utils/themedStyle.js.
    tooltip: {
      // OLD: backgroundColor: isDark ? '#22273C' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
      backgroundColor: isDark ? '#131929' : '#ffffff', // --surface-2 (dark) / --surface-1 (light)
      borderColor: isDark ? '#222a3e' : '#e1e4ee',     // --line
      textStyle: { color: text },
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
