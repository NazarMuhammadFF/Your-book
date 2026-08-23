import { Node, mergeAttributes } from "@tiptap/core";

export interface CustomImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        caption?: string;
        width?: string | number;
        align?: "left" | "center" | "right" | "full";
      }) => ReturnType;
      updateCustomImage: (options: {
        alt?: string;
        title?: string;
        caption?: string;
        width?: string | number;
        align?: "left" | "center" | "right" | "full";
      }) => ReturnType;
    };
  }
}

export const CustomImageExtension = Node.create<CustomImageOptions>({
  name: "image",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      caption: {
        default: "",
      },
      width: {
        default: "100%",
        renderHTML: (attributes) => {
          return {
            "data-width": attributes.width,
          };
        },
      },
      align: {
        default: "center",
        renderHTML: (attributes) => {
          return {
            "data-align": attributes.align,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-type='book-image']",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const img = element.querySelector("img");
          const captionEl = element.querySelector("figcaption");
          return {
            src: img?.getAttribute("src"),
            alt: img?.getAttribute("alt"),
            title: img?.getAttribute("title"),
            caption: captionEl?.textContent || element.getAttribute("data-caption") || "",
            width: element.getAttribute("data-width") || "100%",
            align: element.getAttribute("data-align") || "center",
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            src: element.getAttribute("src"),
            alt: element.getAttribute("alt"),
            title: element.getAttribute("title"),
            caption: element.getAttribute("data-caption") || "",
            width: element.getAttribute("data-width") || "100%",
            align: element.getAttribute("data-align") || "center",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { src, alt, title, caption, width, align } = node.attrs;

    let widthStyle = "100%";
    if (typeof width === "number") widthStyle = `${width}px`;
    else if (typeof width === "string") {
      if (width === "full") widthStyle = "100%";
      else widthStyle = width;
    }

    let marginStyle = "0 auto";
    if (align === "left") marginStyle = "0 auto 0 0";
    else if (align === "right") marginStyle = "0 0 0 auto";

    const figureAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      "data-type": "book-image",
      "data-align": align || "center",
      "data-width": width || "100%",
      "data-caption": caption || "",
      class: `book-figure book-figure-align-${align || "center"}`,
      style: `max-width: ${widthStyle}; margin: ${marginStyle};`,
    });

    const imgAttributes = {
      src,
      alt: alt || "",
      title: title || "",
      class: "book-image-element",
      style: "width: 100%; height: auto; display: block; border-radius: 4px;",
    };

    if (caption && caption.trim()) {
      return [
        "figure",
        figureAttributes,
        ["img", imgAttributes],
        ["figcaption", { class: "book-image-caption" }, caption],
      ];
    }

    return ["figure", figureAttributes, ["img", imgAttributes]];
  },

  addCommands() {
    return {
      setCustomImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      updateCustomImage:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },
});
