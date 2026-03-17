import "./chunk-6IZHOI4F.js";
import {
  animate,
  animation,
  keyframes,
  style,
  useAnimation
} from "./chunk-ONAUKSSE.js";
import "./chunk-WZKIDVDK.js";
import "./chunk-XUDJJ3CF.js";
import "./chunk-U4NN5QIB.js";
import "./chunk-JGB5QRUR.js";
import "./chunk-PNW7LLWN.js";
import "./chunk-TXDUYLVM.js";

// node_modules/ng-animate/fesm2020/ng-animate.mjs
var DEFAULT_TIMING = 1;
var bounce = animation([
  style({ transform: "translate3d(0, 0, 0)" }),
  animate("{{ timing }}s {{ delay }}s", keyframes([
    style({ transform: "translate3d(0, 0, 0)", offset: 0.2 }),
    style({ transform: "translate3d(0, -30px, 0)", offset: 0.4 }),
    style({ transform: "translate3d(0, 0, 0)", offset: 0.53 }),
    style({ transform: "translate3d(0, -15px, 0)", offset: 0.7 }),
    style({ transform: "translate3d(0, -4px, 0)", offset: 0.9 }),
    style({ transform: "translate3d(0, 0, 0)", offset: 1 })
  ]))
], { params: { timing: DEFAULT_TIMING, delay: 0 } });
var flash = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ opacity: 1 }),
  style({ opacity: 0 }),
  style({ opacity: 1 }),
  style({ opacity: 0 }),
  style({ opacity: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var pulse = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "scale3d(1, 1, 1)" }),
  style({ transform: "scale3d({{ scale }}, {{ scale }}, {{ scale }})" }),
  style({ transform: "scale3d(1, 1, 1)" })
])), { params: { scale: 1.25, timing: DEFAULT_TIMING, delay: 0 } });
var rubberBand = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "scale3d(1, 1, 1)", offset: 0 }),
  style({ transform: "scale3d(1.25, 0.75, 1)", offset: 0.3 }),
  style({ transform: "scale3d(0.75, 1.25, 1)", offset: 0.4 }),
  style({ transform: "scale3d(1.15, 0.85, 1)", offset: 0.5 }),
  style({ transform: "scale3d(.95, 1.05, 1)", offset: 0.65 }),
  style({ transform: "scale3d(1.05, .95, 1)", offset: 0.75 }),
  style({ transform: "scale3d(1, 1, 1)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var shake = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "translate3d(0, 0, 0)", offset: 0 }),
  style({ transform: "translate3d({{ translateB }})", offset: 0.1 }),
  style({ transform: "translate3d({{ translateA }})", offset: 0.2 }),
  style({ transform: "translate3d({{ translateB }})", offset: 0.3 }),
  style({ transform: "translate3d({{ translateA }})", offset: 0.4 }),
  style({ transform: "translate3d({{ translateB }})", offset: 0.5 }),
  style({ transform: "translate3d({{ translateA }})", offset: 0.6 }),
  style({ transform: "translate3d({{ translateB }})", offset: 0.7 }),
  style({ transform: "translate3d({{ translateA }})", offset: 0.8 }),
  style({ transform: "translate3d({{ translateB }})", offset: 0.9 }),
  style({ transform: "translate3d(0, 0, 0)", offset: 1 })
])), {
  params: {
    timing: DEFAULT_TIMING,
    delay: 0,
    translateA: "-10px, 0, 0",
    translateB: "10px, 0, 0"
  }
});
var shakeX = shake;
var shakeY = useAnimation(shake, {
  params: { translateA: "0, -10px, 0", translateB: "0, 10px, 0" }
});
var swing = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "rotate3d(0, 0, 1, 15deg)", offset: 0.2 }),
  style({ transform: "rotate3d(0, 0, 1, -10deg)", offset: 0.4 }),
  style({ transform: "rotate3d(0, 0, 1, 5deg)", offset: 0.6 }),
  style({ transform: "rotate3d(0, 0, 1, -5deg)", offset: 0.8 }),
  style({ transform: "rotate3d(0, 0, 1, 0deg)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var tada = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "scale3d(1, 1, 1)", offset: 0 }),
  style({
    transform: "scale3d(.9, .9, .9) rotate3d(0, 0, 1, -3deg)",
    offset: 0.1
  }),
  style({
    transform: "scale3d(.9, .9, .9) rotate3d(0, 0, 1, -3deg)",
    offset: 0.2
  }),
  style({
    transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",
    offset: 0.3
  }),
  style({
    transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",
    offset: 0.4
  }),
  style({
    transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",
    offset: 0.5
  }),
  style({
    transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",
    offset: 0.6
  }),
  style({
    transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",
    offset: 0.7
  }),
  style({
    transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",
    offset: 0.8
  }),
  style({
    transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",
    offset: 0.9
  }),
  style({ transform: "scale3d(1, 1, 1)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var wobble = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "none", offset: 0 }),
  style({
    transform: "translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg)",
    offset: 0.15
  }),
  style({
    transform: "translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg)",
    offset: 0.3
  }),
  style({
    transform: "translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg)",
    offset: 0.45
  }),
  style({
    transform: "translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg)",
    offset: 0.6
  }),
  style({
    transform: "translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg)",
    offset: 0.75
  }),
  style({ transform: "none", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var jello = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "none", offset: 0 }),
  style({ transform: "none", offset: 0.11 }),
  style({ transform: "skewX(-12.5deg) skewY(-12.5deg)", offset: 0.22 }),
  style({ transform: "skewX(6.25deg) skewY(6.25deg)", offset: 0.33 }),
  style({ transform: "skewX(-3.125deg) skewY(-3.125deg)", offset: 0.44 }),
  style({ transform: "skewX(1.5625deg) skewY(1.5625deg)", offset: 0.55 }),
  style({
    transform: "skewX(-0.78125deg) skewY(-0.78125deg)",
    offset: 0.66
  }),
  style({
    transform: "skewX(0.390625deg) skewY(0.390625deg)",
    offset: 0.77
  }),
  style({
    transform: "skewX(-0.1953125deg) skewY(-0.1953125deg)",
    offset: 0.88
  }),
  style({ transform: "none", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var heartBeat = animation(animate("{{ timing }}s {{ delay }}s ease-in-out", keyframes([
  style({ transform: "scale(1)", offset: 0 }),
  style({ transform: "scale({{ scale }})", offset: 0.14 }),
  style({ transform: "scale(1)", offset: 0.28 }),
  style({
    transform: "scale({{ scale }})",
    offset: 0.42
  }),
  style({
    transform: "scale(1)",
    offset: 0.7
  })
])), { params: { timing: DEFAULT_TIMING * 1.3, scale: 1.3, delay: 0 } });
var headShake = animation(animate("{{ timing }}s {{ delay }}s ease-in-out", keyframes([
  style({ transform: "translateX(0)", offset: 0 }),
  style({ transform: "translateX(-6px) rotateY(-9deg)", offset: 0.065 }),
  style({ transform: "translateX(5px) rotateY(7deg)", offset: 0.185 }),
  style({ transform: "translateX(-3px) rotateY(-5deg)", offset: 0.315 }),
  style({ transform: "translateX(2px) rotateY(3deg)", offset: 0.435 }),
  style({ transform: "translateX(0)", offset: 0.5 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var bounceIn = animation(animate("{{ timing }}s {{ delay }}s cubic-bezier(0.215, 0.610, 0.355, 1.000)", keyframes([
  style({ opacity: 0, transform: "scale3d(.3, .3, .3)", offset: 0 }),
  style({ transform: "scale3d(1.1, 1.1, 1.1)", offset: 0.2 }),
  style({ transform: "scale3d(.9, .9, .9)", offset: 0.4 }),
  style({
    opacity: 1,
    transform: "scale3d(1.03, 1.03, 1.03)",
    offset: 0.6
  }),
  style({ transform: "scale3d(.97, .97, .97)", offset: 0.8 }),
  style({ opacity: 1, transform: "scale3d(1, 1, 1)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
function bounceInY(a, b, c, d) {
  return animation(animate("{{ timing }}s {{ delay }}s cubic-bezier(0.215, 0.610, 0.355, 1.000)", keyframes([
    style({
      opacity: 0,
      transform: "translate3d(0, {{ a }}, 0)",
      offset: 0
    }),
    style({
      opacity: 1,
      transform: "translate3d(0, {{ b }}, 0)",
      offset: 0.6
    }),
    style({ transform: "translate3d(0, {{ c }}, 0)", offset: 0.75 }),
    style({ transform: "translate3d(0, {{ d }}, 0)", offset: 0.9 }),
    style({ opacity: 1, transform: "none", offset: 1 })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      a,
      b,
      c,
      d
    }
  });
}
function bounceInX(a, b, c, d) {
  return animation(animate("{{ timing }}s {{ delay }}s cubic-bezier(0.215, 0.610, 0.355, 1.000)", keyframes([
    style({
      opacity: 0,
      transform: "translate3d({{ a }}, 0, 0)",
      offset: 0
    }),
    style({
      opacity: 1,
      transform: "translate3d({{ b }}, 0, 0)",
      offset: 0.6
    }),
    style({ transform: "translate3d({{ c }}, 0, 0)", offset: 0.75 }),
    style({ transform: "translate3d({{ d }}, 0, 0)", offset: 0.9 }),
    style({ opacity: 1, transform: "none", offset: 1 })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      a,
      b,
      c,
      d
    }
  });
}
var bounceInDown = bounceInY("-3000px", "25px", "-10px", "5px");
var bounceInUp = bounceInY("3000px", "-25px", "10px", "-5px");
var bounceInLeft = bounceInX("-3000px", "25px", "-10px", "5px");
var bounceInRight = bounceInX("3000px", "-25px", "10px", "-5px");
var bounceOut = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ transform: "scale3d(.9, .9, .9)", offset: 0.2 }),
  style({
    opacity: 1,
    transform: "scale3d({{ scale }}, {{ scale }}, {{ scale }})",
    offset: 0.5
  }),
  style({
    opacity: 1,
    transform: "scale3d({{ scale }}, {{ scale }}, {{ scale }})",
    offset: 0.55
  }),
  style({ opacity: 0, transform: "scale3d(.3, .3, .3)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0, scale: 1.1 } });
function bounceOutY(a, b, c, d) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({ transform: "translate3d(0, {{ a }}, 0)", offset: 0.2 }),
    style({
      opacity: 1,
      transform: "translate3d(0, {{ b }}, 0)",
      offset: 0.4
    }),
    style({
      opacity: 1,
      transform: "translate3d(0, {{ c }}, 0)",
      offset: 0.45
    }),
    style({
      opacity: 0,
      transform: "translate3d(0, {{ d }}, 0)",
      offset: 1
    })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      a,
      b,
      c,
      d
    }
  });
}
function bounceOutX(a, b) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: 1,
      transform: "translate3d({{ a }}, 0, 0)",
      offset: 0.2
    }),
    style({
      opacity: 0,
      transform: "translate3d({{ b }}, 0, 0)",
      offset: 1
    })
  ])), { params: { timing: DEFAULT_TIMING, delay: 0, a, b } });
}
var bounceOutDown = bounceOutY("10px", "-20px", "-20px", "2000px");
var bounceOutUp = bounceOutY("-10px", "20px", "20px", "-2000px");
var bounceOutLeft = bounceOutX("20px", "-2000px");
var bounceOutRight = bounceOutX("-20px", "2000px");
function fadeXY(fromX, fromY, toX, toY, fromOpacity = 0, toOpacity = 1) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: "{{ fromOpacity }}",
      transform: "translate3d({{ fromX }}, {{ fromY }}, 0)",
      offset: 0
    }),
    style({
      opacity: "{{ toOpacity }}",
      transform: "translate3d({{ toX }}, {{ toY }}, 0)",
      offset: 1
    })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      fromX,
      toX,
      fromY,
      toY,
      fromOpacity,
      toOpacity
    }
  });
}
function fadeInX(a, b, fromOpacity = 0, toOpacity = 1) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: "{{ fromOpacity }}",
      transform: "translate3d({{ a }}, 0, 0)",
      offset: 0
    }),
    style({
      opacity: "{{ toOpacity }}",
      transform: "translate3d({{ b }}, 0, 0)",
      offset: 1
    })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      a,
      b,
      fromOpacity,
      toOpacity
    }
  });
}
function fadeInY(a, b, fromOpacity = 0, toOpacity = 1) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: "{{ fromOpacity }}",
      transform: "translate3d(0, {{ a }}, 0)",
      offset: 0
    }),
    style({
      opacity: "{{ toOpacity }}",
      transform: "translate3d(0, {{ b }}, 0)",
      offset: 1
    })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      a,
      b,
      fromOpacity,
      toOpacity
    }
  });
}
var fadeIn = fadeInX(0, 0);
var fadeInDown = fadeInY("-100%", 0);
var fadeInDownBig = fadeInY("-2000px", 0);
var fadeInUp = fadeInY("100%", 0);
var fadeInUpBig = fadeInY("2000px", 0);
var fadeInLeft = fadeInX("-100%", 0);
var fadeInLeftBig = fadeInX("-2000px", 0);
var fadeInRight = fadeInX("100%", 0);
var fadeInRightBig = fadeInX("2000px", 0);
var fadeInTopLeft = fadeXY("-100%", "-100%", 0, 0);
var fadeInTopRight = fadeXY("100%", "-100%", 0, 0);
var fadeInBottomLeft = fadeXY("-100%", "100%", 0, 0);
var fadeInBottomRight = fadeXY("100%", "100%", 0, 0);
function fadeOutX(a, b) {
  return fadeInX(a, b, 1, 0);
}
function fadeOutY(a, b) {
  return fadeInY(a, b, 1, 0);
}
var fadeOut = fadeOutX(0, 0);
var fadeOutDown = fadeOutY(0, "100%");
var fadeOutDownBig = fadeOutY(0, "2000px");
var fadeOutUp = fadeOutY(0, "-100%");
var fadeOutUpBig = fadeOutY(0, "-2000px");
var fadeOutLeft = fadeOutX(0, "-100%");
var fadeOutLeftBig = fadeOutX(0, "-2000px");
var fadeOutRight = fadeOutX(0, "100%");
var fadeOutRightBig = fadeOutX(0, "2000px");
var fadeOutTopLeft = fadeXY(0, 0, "-100%", "-100%", 1, 0);
var fadeOutTopRight = fadeXY(0, 0, "100%", "-100%", 1, 0);
var fadeOutBottomLeft = fadeXY(0, 0, "-100%", "100%", 1, 0);
var fadeOutBottomRight = fadeXY(0, 0, "100%", "100%", 1, 0);
function slideX(a, b) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      transform: "translate3d({{ a }}, 0, 0)",
      offset: 0
    }),
    style({
      transform: "translate3d({{ b }}, 0, 0)",
      offset: 1
    })
  ])), { params: { timing: DEFAULT_TIMING, delay: 0, a, b } });
}
function slideY(a, b) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      transform: "translate3d(0, {{ a }}, 0)",
      offset: 0
    }),
    style({
      transform: "translate3d(0, {{ b }}, 0)",
      offset: 1
    })
  ])), { params: { timing: DEFAULT_TIMING, delay: 0, a, b } });
}
var slideInUp = slideY("-100%", 0);
var slideInDown = slideY("100%", 0);
var slideInLeft = slideX("-100%", 0);
var slideInRight = slideX("100%", 0);
var slideOutUp = slideY(0, "-100%");
var slideOutDown = slideY(0, "100%");
var slideOutLeft = slideX(0, "-100%");
var slideOutRight = slideX(0, "100%");
var flip = animation([
  style({ "backface-visibility": "visible" }),
  animate("{{ timing }}s {{ delay }}s ease-out", keyframes([
    style({
      transform: "perspective(400px) rotate3d(0, 1, 0, -360deg)",
      offset: 0
    }),
    style({
      transform: "perspective(400px) scale3d(1.5, 1.5, 1.5) rotate3d(0, 1, 0, -190deg)",
      offset: 0.4
    }),
    style({
      transform: "perspective(400px) scale3d(1.5, 1.5, 1.5) rotate3d(0, 1, 0, -170deg)",
      offset: 0.5
    }),
    style({
      transform: "perspective(400px) scale3d(.95, .95, .95)",
      offset: 0.8
    }),
    style({
      transform: "perspective(400px)",
      offset: 1
    })
  ]))
], {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
function flipIn(rotateX, rotateY) {
  return animation([
    style({ "backface-visibility": "visible" }),
    animate("{{ timing }}s {{ delay }}s ease-in", keyframes([
      style({
        opacity: 0,
        transform: "perspective(400px) rotate3d({{ rotateX }}, {{ rotateY }}, 0, 90deg)",
        offset: 0
      }),
      style({
        opacity: 1,
        transform: "perspective(400px) rotate3d({{ rotateX }}, {{ rotateY }}, 0, -20deg)",
        offset: 0.4
      }),
      style({
        transform: "perspective(400px) rotate3d({{ rotateX }}, {{ rotateY }}, 0, 10deg)",
        offset: 0.6
      }),
      style({
        transform: "perspective(400px) rotate3d({{ rotateX }}, {{ rotateY }}, 0, -5deg)",
        offset: 0.8
      }),
      style({
        transform: "perspective(400px) rotate3d(0, 0, 0, 0)",
        offset: 1
      })
    ]))
  ], { params: { timing: DEFAULT_TIMING, delay: 0, rotateX, rotateY } });
}
var flipInX = flipIn(1, 0);
var flipInY = flipIn(0, 1);
function flipOut(rotateX, rotateY) {
  return animation([
    style({ "backface-visibility": "visible" }),
    animate("{{ timing }}s {{ delay }}s", keyframes([
      style({
        transform: "perspective(400px)",
        offset: 0
      }),
      style({
        opacity: 1,
        transform: "perspective(400px) rotate3d({{ rotateX }}, {{ rotateY }}, 0, -20deg)",
        offset: 0.3
      }),
      style({
        opacity: 0,
        transform: "perspective(400px) rotate3d({{ rotateX }}, {{ rotateY }}, 0, 90deg)",
        offset: 1
      })
    ]))
  ], { params: { timing: DEFAULT_TIMING, delay: 0, rotateX, rotateY } });
}
var flipOutX = flipOut(1, 0);
var flipOutY = flipOut(0, 1);
var lightSpeedInLeft = animation(animate("{{ timing }}s {{ delay }}s ease-out", keyframes([
  style({
    transform: "translate3d(-100%, 0, 0) skewX(30deg)",
    opacity: 0,
    offset: 0
  }),
  style({
    transform: "skewX(-20deg)",
    opacity: 1,
    offset: 0.6
  }),
  style({
    transform: "skewX(5deg)",
    offset: 0.8
  }),
  style({
    transform: "translate3d(0, 0, 0)",
    offset: 1
  })
])), {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
var lightSpeedIn = animation(animate("{{ timing }}s {{ delay }}s ease-out", keyframes([
  style({
    transform: "translate3d(100%, 0, 0) skewX(-30deg)",
    opacity: 0,
    offset: 0
  }),
  style({
    transform: "skewX(20deg)",
    opacity: 1,
    offset: 0.6
  }),
  style({
    transform: "skewX(-5deg)",
    offset: 0.8
  }),
  style({
    transform: "translate3d(0, 0, 0)",
    offset: 1
  })
])), {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
var lightSpeedInRight = lightSpeedIn;
var lightSpeedOut = animation(animate("{{ timing }}s {{ delay }}s ease-in", keyframes([
  style({
    opacity: 1,
    offset: 0
  }),
  style({
    opacity: 0,
    transform: "translate3d(100%, 0, 0) skewX(30deg)",
    offset: 1
  })
])), {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
var lightSpeedOutRight = lightSpeedOut;
var lightSpeedOutLeft = animation(animate("{{ timing }}s {{ delay }}s ease-in", keyframes([
  style({
    opacity: 1,
    offset: 0
  }),
  style({
    opacity: 0,
    transform: "translate3d(-100%, 0, 0) skewX(-30deg)",
    offset: 1
  })
])), {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
function rotateInDirection(origin, degrees) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      "transform-origin": "{{ origin }}",
      opacity: "{{ fromOpacity }}",
      transform: "rotate3d(0, 0, 1, {{ degrees }})",
      offset: 0
    }),
    style({
      "transform-origin": "{{ origin }}",
      opacity: "{{ toOpacity }}",
      transform: "none",
      offset: 1
    })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      origin,
      degrees,
      fromOpacity: 0,
      toOpacity: 1
    }
  });
}
function rotateOutDirection(origin, degrees) {
  return animation(animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      "transform-origin": "{{ origin }}",
      opacity: "{{ fromOpacity }}",
      transform: "none",
      offset: 0
    }),
    style({
      "transform-origin": "{{ origin }}",
      opacity: "{{ toOpacity }}",
      transform: "rotate3d(0, 0, 1, {{ degrees }})",
      offset: 1
    })
  ])), {
    params: {
      timing: DEFAULT_TIMING,
      delay: 0,
      origin,
      degrees,
      fromOpacity: 1,
      toOpacity: 0
    }
  });
}
var rotateIn = rotateInDirection("center", "-200deg");
var rotateInDownLeft = rotateInDirection("left bottom", "-45deg");
var rotateInDownRight = rotateInDirection("right bottom", "45deg");
var rotateInUpLeft = rotateInDirection("left bottom", "45deg");
var rotateInUpRight = rotateInDirection("right bottom", "-90deg");
var rotateOut = rotateOutDirection("center", "200deg");
var rotateOutDownLeft = rotateOutDirection("left bottom", "45deg");
var rotateOutDownRight = rotateOutDirection("right bottom", "-45deg");
var rotateOutUpLeft = rotateOutDirection("left bottom", "-45deg");
var rotateOutUpRight = rotateOutDirection("right bottom", "90deg");
var hinge = animation([
  style({ "transform-origin": "top left" }),
  animate("{{ timing }}s {{ delay }}s ease-in-out", keyframes([
    style({
      transform: "rotate3d(0, 0, 1, 80deg)",
      offset: 0.2
    }),
    style({
      transform: "rotate3d(0, 0, 1, 60deg)",
      offset: 0.4
    }),
    style({
      transform: "rotate3d(0, 0, 1, 80deg)",
      offset: 0.6
    }),
    style({
      opacity: 1,
      transform: "rotate3d(0, 0, 1, 60deg)",
      offset: 0.8
    }),
    style({
      opacity: 0,
      transform: "translate3d(0, 700px, 0)",
      offset: 1
    })
  ]))
], {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
var jackInTheBox = animation([
  animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: 0,
      transform: "scale(0.1) rotate(30deg)",
      "transform-origin": "center bottom",
      offset: 0
    }),
    style({
      opacity: 0.5,
      transform: "rotate(-10deg)",
      offset: 0.5
    }),
    style({
      opacity: 0.7,
      transform: "rotate(3deg)",
      offset: 0.7
    }),
    style({
      opacity: 1,
      transform: "scale(1)",
      offset: 1
    })
  ]))
], {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
var rollIn = animation([
  animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: 0,
      transform: "translate3d(-100%, 0, 0) rotate3d(0, 0, 1, -120deg)",
      offset: 0
    }),
    style({
      opacity: 1,
      transform: "none",
      offset: 1
    })
  ]))
], {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
var rollOut = animation([
  animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: 1,
      offset: 0
    }),
    style({
      opacity: 0,
      transform: "translate3d(100%, 0, 0) rotate3d(0, 0, 1, 120deg)",
      offset: 1
    })
  ]))
], {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
var zoomIn = animation([
  animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: 0,
      transform: "scale3d(.3, .3, .3)",
      offset: 0
    }),
    style({
      opacity: 1,
      transform: "scale3d(1, 1, 1)",
      offset: 0.5
    })
  ]))
], {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
function zoomInY(a, b) {
  return animation(animate("{{ timing }}s {{ delay }}s cubic-bezier(0.550, 0.055, 0.675, 0.190)", keyframes([
    style({
      opacity: 0,
      transform: `scale3d(.1, .1, .1) translate3d(0, {{ a }}, 0)`,
      offset: 0
    }),
    style({
      opacity: 1,
      transform: `scale3d(.475, .475, .475) translate3d(0, {{ b }}, 0)`,
      offset: 0.6
    })
  ])), { params: { timing: DEFAULT_TIMING, delay: 0, a, b } });
}
function zoomInX(a, b) {
  return animation(animate("{{ timing }}s {{ delay }}s cubic-bezier(0.550, 0.055, 0.675, 0.190)", keyframes([
    style({
      opacity: 0,
      transform: `scale3d(.1, .1, .1) translate3d({{ a }}, 0, 0)`,
      offset: 0
    }),
    style({
      opacity: 1,
      transform: `scale3d(.475, .475, .475) translate3d({{ b }}, 0, 0)`,
      offset: 0.6
    })
  ])), { params: { timing: DEFAULT_TIMING, delay: 0, a, b } });
}
var zoomInDown = zoomInY("-1000px", "10px");
var zoomInUp = zoomInY("1000px", "-10px");
var zoomInLeft = zoomInX("-1000px", "10px");
var zoomInRight = zoomInX("1000px", "-10px");
var zoomOut = animation([
  animate("{{ timing }}s {{ delay }}s", keyframes([
    style({
      opacity: 1,
      offset: 0
    }),
    style({
      opacity: 0,
      transform: "scale3d(.3, .3, .3)",
      offset: 0.5
    }),
    style({
      opacity: 0,
      offset: 1
    })
  ]))
], {
  params: { timing: DEFAULT_TIMING, delay: 0 }
});
function zoomOutY(a, b) {
  return animation(animate("{{ timing }}s {{ delay }}s cubic-bezier(0.550, 0.055, 0.675, 0.190)", keyframes([
    style({
      opacity: 1,
      transform: `scale3d(.475, .475, .475) translate3d(0, {{ a }}, 0)`,
      offset: 0.4
    }),
    style({
      opacity: 0,
      transform: `scale3d(.1, .1, .1) translate3d(0, {{ b }}, 0)`,
      offset: 1
    })
  ])), { params: { timing: DEFAULT_TIMING, delay: 0, a, b } });
}
function zoomOutX(a, b) {
  return animation(animate("{{ timing }}s {{ delay }}s cubic-bezier(0.550, 0.055, 0.675, 0.190)", keyframes([
    style({
      opacity: 1,
      transform: `scale3d(.475, .475, .475) translate3d({{ a }}, 0, 0)`,
      offset: 0.4
    }),
    style({
      opacity: 0,
      transform: `scale3d(.1, .1, .1) translate3d({{ b }}, 0, 0)`,
      offset: 1
    })
  ])), { params: { timing: DEFAULT_TIMING, delay: 0, a, b } });
}
var zoomOutDown = zoomOutY("-60px", "2000px");
var zoomOutUp = zoomOutY("60px", "-2000px");
var zoomOutLeft = zoomOutX("42px", "-2000px");
var zoomOutRight = zoomOutX("-42px", "2000px");
var backInUp = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({
    opacity: 0.7,
    transform: "translateY(1200px) scale(0.7)",
    offset: 0
  }),
  style({
    opacity: 0.7,
    transform: "translateY(0px) scale(0.7)",
    offset: 0.8
  }),
  style({ opacity: 1, transform: "scale(1)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var backInDown = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({
    opacity: 0.7,
    transform: "translateY(-1200px) scale(0.7)",
    offset: 0
  }),
  style({
    opacity: 0.7,
    transform: "translateY(0px) scale(0.7)",
    offset: 0.8
  }),
  style({ opacity: 1, transform: "scale(1)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var backInLeft = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({
    opacity: 0.7,
    transform: "translateX(-2000px) scale(0.7)",
    offset: 0
  }),
  style({
    opacity: 0.7,
    transform: "translateX(0px) scale(0.7)",
    offset: 0.8
  }),
  style({ opacity: 1, transform: "scale(1)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var backInRight = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({
    opacity: 0.7,
    transform: "translateX(2000px) scale(0.7)",
    offset: 0
  }),
  style({
    opacity: 0.7,
    transform: "translateX(0px) scale(0.7)",
    offset: 0.8
  }),
  style({ opacity: 1, transform: "scale(1)", offset: 1 })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var backOutUp = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ opacity: 1, transform: "scale(1)" }),
  style({ opacity: 0.7, transform: "translateY(0px) scale(0.7)" }),
  style({ opacity: 0.7, transform: "translateY(-700px) scale(0.7)" })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var backOutDown = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ opacity: 1, transform: "scale(1)" }),
  style({ opacity: 0.7, transform: "translateY(0px) scale(0.7)" }),
  style({ opacity: 0.7, transform: "translateY(700px) scale(0.7)" })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var backOutRight = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ opacity: 1, transform: "scale(1)" }),
  style({ opacity: 0.7, transform: "translateX(0px) scale(0.7)" }),
  style({ opacity: 0.7, transform: "translateX(2000px) scale(0.7)" })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
var backOutLeft = animation(animate("{{ timing }}s {{ delay }}s", keyframes([
  style({ opacity: 1, transform: "scale(1)" }),
  style({ opacity: 0.7, transform: "translateX(0px) scale(0.7)" }),
  style({ opacity: 0.7, transform: "translateX(-2000px) scale(0.7)" })
])), { params: { timing: DEFAULT_TIMING, delay: 0 } });
export {
  backInDown,
  backInLeft,
  backInRight,
  backInUp,
  backOutDown,
  backOutLeft,
  backOutRight,
  backOutUp,
  bounce,
  bounceIn,
  bounceInDown,
  bounceInLeft,
  bounceInRight,
  bounceInUp,
  bounceInX,
  bounceInY,
  bounceOut,
  bounceOutDown,
  bounceOutLeft,
  bounceOutRight,
  bounceOutUp,
  bounceOutX,
  bounceOutY,
  fadeIn,
  fadeInBottomLeft,
  fadeInBottomRight,
  fadeInDown,
  fadeInDownBig,
  fadeInLeft,
  fadeInLeftBig,
  fadeInRight,
  fadeInRightBig,
  fadeInTopLeft,
  fadeInTopRight,
  fadeInUp,
  fadeInUpBig,
  fadeInX,
  fadeInY,
  fadeOut,
  fadeOutBottomLeft,
  fadeOutBottomRight,
  fadeOutDown,
  fadeOutDownBig,
  fadeOutLeft,
  fadeOutLeftBig,
  fadeOutRight,
  fadeOutRightBig,
  fadeOutTopLeft,
  fadeOutTopRight,
  fadeOutUp,
  fadeOutUpBig,
  fadeOutX,
  fadeOutY,
  fadeXY,
  flash,
  flip,
  flipIn,
  flipInX,
  flipInY,
  flipOut,
  flipOutX,
  flipOutY,
  headShake,
  heartBeat,
  hinge,
  jackInTheBox,
  jello,
  lightSpeedIn,
  lightSpeedInLeft,
  lightSpeedInRight,
  lightSpeedOut,
  lightSpeedOutLeft,
  lightSpeedOutRight,
  pulse,
  rollIn,
  rollOut,
  rotateIn,
  rotateInDirection,
  rotateInDownLeft,
  rotateInDownRight,
  rotateInUpLeft,
  rotateInUpRight,
  rotateOut,
  rotateOutDirection,
  rotateOutDownLeft,
  rotateOutDownRight,
  rotateOutUpLeft,
  rotateOutUpRight,
  rubberBand,
  shake,
  shakeX,
  shakeY,
  slideInDown,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideOutDown,
  slideOutLeft,
  slideOutRight,
  slideOutUp,
  slideX,
  slideY,
  swing,
  tada,
  wobble,
  zoomIn,
  zoomInDown,
  zoomInLeft,
  zoomInRight,
  zoomInUp,
  zoomInX,
  zoomInY,
  zoomOut,
  zoomOutDown,
  zoomOutLeft,
  zoomOutRight,
  zoomOutUp,
  zoomOutX,
  zoomOutY
};
//# sourceMappingURL=ng-animate.js.map
