import type { ThemeConfig } from 'antd';

/**
 * Ant Design 5 Theme Configuration
 * Professional dark-accented palette for B2B management dashboard.
 * Primary: Deep Blue (#1B2A4A) for trust/authority
 * Accent: Electric Blue (#2F54EB) for CTAs and highlights
 */
const theme: ThemeConfig = {
  token: {
    // Primary palette
    colorPrimary: '#2F54EB',
    colorInfo: '#2F54EB',
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',

    // Background & surface
    colorBgBase: '#F5F7FA',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F0F2F5',

    // Text
    colorText: '#1A1A2E',
    colorTextSecondary: '#6B7280',
    colorTextTertiary: '#9CA3AF',

    // Border & shadows
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 30,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,

    // Spacing
    marginLG: 24,
    marginMD: 16,
    marginSM: 12,
    paddingLG: 24,
    paddingMD: 16,

    // Shadows
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Layout: {
      siderBg: '#0F1629',
      headerBg: '#FFFFFF',
      bodyBg: '#F0F2F5',
      triggerBg: '#1B2A4A',
      triggerColor: '#FFFFFF',
    },
    Menu: {
      darkItemBg: '#0F1629',
      darkSubMenuItemBg: '#0A0F1F',
      darkItemSelectedBg: '#2F54EB',
      darkItemHoverBg: '#1B2A4A',
      darkItemColor: '#A0AEC0',
      darkItemSelectedColor: '#FFFFFF',
      itemBorderRadius: 8,
      iconSize: 18,
      collapsedIconSize: 20,
    },
    Button: {
      primaryShadow: '0 2px 4px rgba(47, 84, 235, 0.3)',
      borderRadius: 8,
      controlHeight: 40,
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
    },
    Table: {
      borderRadius: 12,
      headerBg: '#F8FAFC',
      headerColor: '#374151',
      rowHoverBg: '#F0F5FF',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Statistic: {
      contentFontSize: 28,
    },
  },
};

export default theme;
