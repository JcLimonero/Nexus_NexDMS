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
  static data: ConfigData = {
    settings: {
      layout_type: "ltr",
      sidebar: {
        type: "default",
        body_type: "default",
      },
      sidebar_setting: "default-sidebar",
      sidebar_backround: "dark-sidebar",
    },
    color: {
      layout_version: "light",
      color: "color-1",
      primary_color: "#4466f2",
      secondary_color: "#1ea6ec",
      mix_layout: "default",
    },
    router_animation: "fadeIn",
  };
}
