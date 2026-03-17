export interface ConfigData {
  settings: {
    layout_type: string;
    sidebar: {
      type: string;
      body_type: string;
    };
    sidebar_setting: string;
    sidebar_backround: string;
  };
  color: {
    layout_version: string;
    color: string;
    primary_color: string;
    secondary_color: string;
    mix_layout: string;
  };
  router_animation: string;
}

export class ConfigDB {
  static data = {
    settings: {
    layout_type: 'ltr',
    sidebar: {
       type: 'default',
       body_type: 'default'
    },
    sidebar_setting: 'border-sidebar',
    sidebar_backround: 'dark-sidebar'
 },
 color: {
    layout_version: 'light',
    color: 'color-2',
    primary_color: '#0288d1',
    secondary_color: '#26c6da',
    mix_layout: 'dark-header-sidebar-mix'

 },
 router_animation: 'fadeIn'
 };
}
