import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { ResizableImageNodeView } from "../components/ResizableImageNodeView";

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
        wrapMode?: "inline" | "wrap-left" | "wrap-right" | "break-text";
      }) => ReturnType;
      updateCustomImage: (options: {
        alt?: string;
        title?: string;
        caption?: string;
        width?: string | number;
        align?: "left" | "center" | "right" | "full";
        wrapMode?: "inline" | "wrap-left" | "wrap-right" | "break-text";
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
        default: "50%",
        renderHTML: (attributes) => {
          return {
            "data-width": attributes.width,
          };
        },
      },
      align: {
        default: "left",
        renderHTML: (attributes) => {
          return {
            "data-align": attributes.align,
          };
        },
      },
      wrapMode: {
        default: "wrap-left",
        renderHTML: (attributes) => {
          return {
            "data-wrap": attributes.wrapMode,
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
            width: element.getAttribute("data-width") || "50%",
            align: element.getAttribute("data-align") || "left",
            wrapMode: element.getAttribute("data-wrap") || "wrap-left",
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
            width: element.getAttribute("data-width") || "50%",
            align: element.getAttribute("data-align") || "left",
            wrapMode: element.getAttribute("data-wrap") || "wrap-left",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { src, alt, title, caption, width, align, wrapMode } = node.attrs;

    let widthStyle = "50%";
    if (typeof width === "number") widthStyle = `${width}px`;
    else if (typeof width === "string") {
      if (width === "full") widthStyle = "100%";
      else widthStyle = width;
    }

    const effectiveWrap = wrapMode || (align === "right" ? "wrap-right" : align === "center" ? "inline" : "wrap-left");

    let floatStyle: "left" | "right" | "none" = "none";
    let marginStyle = "12px auto";
    let clearStyle = "both";
    let displayStyle = "block";

    if (effectiveWrap === "wrap-left") {
      floatStyle = "left";
      marginStyle = "6px 20px 14px 0";
      clearStyle = "none";
      displayStyle = "inline-block";
    } else if (effectiveWrap === "wrap-right") {
      floatStyle = "right";
      marginStyle = "6px 0 14px 20px";
      clearStyle = "none";
      displayStyle = "inline-block";
    } else if (effectiveWrap === "break-text") {
      displayStyle = "block";
      widthStyle = "100%";
      marginStyle = "16px 0";
      clearStyle = "both";
    }

    const figureAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      "data-type": "book-image",
      "data-align": align || "left",
      "data-wrap": effectiveWrap,
      "data-width": width || "50%",
      "data-caption": caption || "",
      class: `book-figure book-figure-${effectiveWrap}`,
      style: `width: ${widthStyle}; max-width: 100%; float: ${floatStyle}; clear: ${clearStyle}; margin: ${marginStyle}; display: ${displayStyle};`,
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

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },

  addCommands() {
    return {
      setCustomImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              width: "50%",
              align: "left",
              wrapMode: "wrap-left",
              ...options,
            },
          });
        },
      updateCustomImage:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              const hasFiles = event.dataTransfer?.files && event.dataTransfer.files.length > 0;
              if (!hasFiles) return false;
              const file = event.dataTransfer!.files[0];
              if (!file || !file.type.startsWith("image/")) return false;

              event.preventDefault();
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const dataUrl = readerEvent.target?.result as string;
                if (dataUrl) {
                  const node = view.state.schema.nodes.image.create({
                    src: dataUrl,
                    alt: file.name.replace(/\.[^/.]+$/, ""),
                    width: "50%",
                    align: "left",
                    wrapMode: "wrap-left",
                  });
                  const insertPos = coordinates ? coordinates.pos : view.state.selection.from;
                  const tr = view.state.tr.insert(insertPos, node);
                  view.dispatch(tr);
                }
              };
              reader.readAsDataURL(file);
              return true;
            },
            paste: (view, event) => {
              const items = event.clipboardData?.items;
              if (!items) return false;

              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith("image/")) {
                  const file = item.getAsFile();
                  if (!file) continue;

                  event.preventDefault();
                  const reader = new FileReader();
                  reader.onload = (readerEvent) => {
                    const dataUrl = readerEvent.target?.result as string;
                    if (dataUrl) {
                      const node = view.state.schema.nodes.image.create({
                        src: dataUrl,
                        alt: "Pasted image",
                        width: "50%",
                        align: "left",
                        wrapMode: "wrap-left",
                      });
                      const tr = view.state.tr.insert(view.state.selection.from, node);
                      view.dispatch(tr);
                    }
                  };
                  reader.readAsDataURL(file);
                  return true;
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

