import { Node } from "@tiptap/core";

export const PageDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "page+",
});
