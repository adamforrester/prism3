/**
 * Do not edit directly
 * Generated on Tue, 19 May 2026 22:13:03 GMT
 */

module.exports = {
  "font": {
    "family": {
      "primary": {
        "$type": "fontFamily",
        "$value": "Inter, -apple-system, sans-serif"
      }
    }
  },
  "$extensions": {
    "generator": {
      "name": "Token Forge",
      "version": "1.0.0"
    }
  },
  "color": {
    "red": {
      "50": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [
            0.996,
            0.949,
            0.949
          ]
        },
        "$extensions": {
          "figma": {
            "variableId": "VariableID:1",
            "collection": "primitives",
            "scopes": [
              "ALL_SCOPES"
            ]
          }
        }
      },
      "500": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [
            0.937,
            0.325,
            0.314
          ]
        }
      }
    }
  },
  "spacing": {
    "xs": {
      "$type": "dimension",
      "$value": {
        "value": 4,
        "unit": "px",
        "filePath": "tokens/primitives.json",
        "isSource": true,
        "original": {
          "value": 4,
          "unit": "px"
        },
        "name": "SpacingXsValue",
        "attributes": {
          "category": "spacing",
          "type": "xs",
          "item": "$value"
        },
        "path": [
          "spacing",
          "xs",
          "$value"
        ]
      }
    },
    "sm": {
      "$type": "dimension",
      "$value": {
        "value": 8,
        "unit": "px",
        "filePath": "tokens/primitives.json",
        "isSource": true,
        "original": {
          "value": 8,
          "unit": "px"
        },
        "name": "SpacingSmValue",
        "attributes": {
          "category": "spacing",
          "type": "sm",
          "item": "$value"
        },
        "path": [
          "spacing",
          "sm",
          "$value"
        ]
      }
    }
  },
  "shadow": {
    "card": {
      "raised": {
        "$type": "shadow",
        "$value": [
          {
            "color": {
              "colorSpace": "srgb",
              "components": [
                0,
                0,
                0
              ],
              "alpha": 0.12
            },
            "offsetX": {
              "value": 0,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            },
            "offsetY": {
              "value": 2,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            },
            "blur": {
              "value": 6,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            },
            "spread": {
              "value": 0,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            }
          },
          {
            "color": {
              "colorSpace": "srgb",
              "components": [
                0,
                0,
                0
              ],
              "alpha": 0.08
            },
            "offsetX": {
              "value": 0,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            },
            "offsetY": {
              "value": 8,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            },
            "blur": {
              "value": 16,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            },
            "spread": {
              "value": 0,
              "unit": "px",
              "filePath": "tokens/shadows.json",
              "isSource": true
            }
          }
        ]
      }
    }
  },
  "typography": {
    "body": {
      "medium": {
        "$type": "typography",
        "$value": {
          "fontFamily": {
            "$type": "fontFamily",
            "$value": "Inter, -apple-system, sans-serif"
          },
          "fontSize": {
            "value": 16,
            "unit": "px",
            "filePath": "tokens/typography.json",
            "isSource": true,
            "original": {
              "value": 16,
              "unit": "px"
            },
            "name": "TypographyBodyMediumValueFontSize",
            "attributes": {
              "category": "typography",
              "type": "body",
              "item": "medium",
              "subitem": "$value",
              "state": "fontSize"
            },
            "path": [
              "typography",
              "body",
              "medium",
              "$value",
              "fontSize"
            ]
          },
          "fontWeight": 400,
          "letterSpacing": {
            "value": 0,
            "unit": "px",
            "filePath": "tokens/typography.json",
            "isSource": true,
            "original": {
              "value": 0,
              "unit": "px"
            },
            "name": "TypographyBodyMediumValueLetterSpacing",
            "attributes": {
              "category": "typography",
              "type": "body",
              "item": "medium",
              "subitem": "$value",
              "state": "letterSpacing"
            },
            "path": [
              "typography",
              "body",
              "medium",
              "$value",
              "letterSpacing"
            ]
          },
          "lineHeight": 1.5
        },
        "$extensions": {
          "figma": {
            "styleId": "S:123",
            "paragraphSpacing": 8
          }
        }
      }
    },
    "heading": {
      "large": {
        "$type": "typography",
        "$value": {
          "fontFamily": {
            "$type": "fontFamily",
            "$value": "Inter, -apple-system, sans-serif"
          },
          "fontSize": {
            "value": 32,
            "unit": "px",
            "filePath": "tokens/typography.json",
            "isSource": true,
            "original": {
              "value": 32,
              "unit": "px"
            },
            "name": "TypographyHeadingLargeValueFontSize",
            "attributes": {
              "category": "typography",
              "type": "heading",
              "item": "large",
              "subitem": "$value",
              "state": "fontSize"
            },
            "path": [
              "typography",
              "heading",
              "large",
              "$value",
              "fontSize"
            ]
          },
          "fontWeight": 700,
          "letterSpacing": {
            "value": -0.5,
            "unit": "px",
            "filePath": "tokens/typography.json",
            "isSource": true,
            "original": {
              "value": -0.5,
              "unit": "px"
            },
            "name": "TypographyHeadingLargeValueLetterSpacing",
            "attributes": {
              "category": "typography",
              "type": "heading",
              "item": "large",
              "subitem": "$value",
              "state": "letterSpacing"
            },
            "path": [
              "typography",
              "heading",
              "large",
              "$value",
              "letterSpacing"
            ]
          },
          "lineHeight": 1.2
        }
      }
    }
  }
};
