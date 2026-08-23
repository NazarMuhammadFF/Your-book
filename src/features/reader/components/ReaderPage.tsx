import React from "react";
import { Book } from "../../books/types/book";
import { JSONContent } from "@tiptap/react";
import { PageCanvas } from "../../document/components/PageCanvas";
import styles from "./ReaderPage.module.css";
import "../../document/styles/editor.css";

export interface ReaderPageProps {
  book: Book;
  pageNumber: number;
  totalPages?: number;
  nodes?: JSONContent[];
  runningTitle?: string;
  isEndCover?: boolean;
}

export function renderInlineMarks(text: string, marks?: Array<{ type: string; attrs?: Record<string, any> }>): React.ReactNode {
  if (!marks || marks.length === 0) return text;

  let content: React.ReactNode = text;

  for (const mark of marks) {
    if (mark.type === "bold") content = <strong key="bold">{content}</strong>;
    else if (mark.type === "italic") content = <em key="italic">{content}</em>;
    else if (mark.type === "underline") content = <u key="underline">{content}</u>;
    else if (mark.type === "strike") content = <s key="strike">{content}</s>;
    else if (mark.type === "code") content = <code key="code">{content}</code>;
    else if (mark.type === "highlight") {
      content = (
        <mark key="highlight" style={{ backgroundColor: mark.attrs?.color || "#ffec99" }}>
          {content}
        </mark>
      );
    } else if (mark.type === "textStyle") {
      const style: React.CSSProperties = {};
      if (mark.attrs?.color) style.color = mark.attrs.color;
      if (mark.attrs?.fontSize) style.fontSize = mark.attrs.fontSize;
      content = <span key="textStyle" style={style}>{content}</span>;
    }
  }

  return content;
}

export function renderNodeContent(node: JSONContent, index: number): React.ReactNode {
  if (!node) return null;

  if (node.type === "heading") {
    const level = node.attrs?.level || 1;
    const textContent = node.content?.map((c, i) =>
      c.text ? <React.Fragment key={i}>{renderInlineMarks(c.text, c.marks)}</React.Fragment> : null
    );

    if (level === 1) return <h1 key={index}>{textContent}</h1>;
    if (level === 2) return <h2 key={index}>{textContent}</h2>;
    return <h3 key={index}>{textContent}</h3>;
  }

  if (node.type === "paragraph") {
    const textContent = node.content?.map((c, i) =>
      c.text ? <React.Fragment key={i}>{renderInlineMarks(c.text, c.marks)}</React.Fragment> : null
    );
    const textAlign = node.attrs?.textAlign || "inherit";
    return (
      <p key={index} style={{ textAlign }} className={styles.paragraph}>
        {textContent || "\u00A0"}
      </p>
    );
  }

  if (node.type === "blockquote") {
    return (
      <blockquote key={index} className={styles.quote}>
        {node.content?.map((child, i) => renderNodeContent(child, i))}
      </blockquote>
    );
  }

  if (node.type === "bulletList") {
    return (
      <ul key={index} className={styles.list}>
        {node.content?.map((item, i) => (
          <li key={i}>{item.content?.map((c, ci) => renderNodeContent(c, ci))}</li>
        ))}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={index} className={styles.list}>
        {node.content?.map((item, i) => (
          <li key={i}>{item.content?.map((c, ci) => renderNodeContent(c, ci))}</li>
        ))}
      </ol>
    );
  }

  if (node.type === "taskList") {
    return (
      <ul key={index} data-type="taskList" className={styles.taskList}>
        {node.content?.map((item, i) => {
          const checked = Boolean(item.attrs?.checked);
          return (
            <li key={i} className={styles.taskItem}>
              <label>
                <input type="checkbox" checked={checked} readOnly />
              </label>
              <div>{item.content?.map((c, ci) => renderNodeContent(c, ci))}</div>
            </li>
          );
        })}
      </ul>
    );
  }

  if (node.type === "image") {
    const { src, alt, caption, width, align } = node.attrs || {};
    let margin = "12px auto";
    if (align === "left") margin = "12px auto 12px 0";
    else if (align === "right") margin = "12px 0 12px auto";

    return (
      <figure
        key={index}
        className="book-figure"
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: width || "100%",
          maxHeight: "calc(100% - 24px)",
          margin,
        }}
      >
        <img
          src={src}
          alt={alt || ""}
          className="book-image-element"
          style={{ maxHeight: caption ? "calc(100% - 30px)" : "100%", objectFit: "contain" }}
        />
        {caption && <figcaption className="book-image-caption">{caption}</figcaption>}
      </figure>
    );
  }

  if (node.type === "horizontalRule") {
    return <hr key={index} className={styles.divider} />;
  }

  return null;
}

export const ReaderPage = React.forwardRef<HTMLDivElement, ReaderPageProps>(
  ({ book, pageNumber, totalPages, runningTitle, nodes, isEndCover }, ref) => {
    const side = pageNumber % 2 === 0 ? "left" : "right";

    return (
      <PageCanvas
        ref={ref}
        book={book}
        pageNumber={pageNumber}
        totalPages={totalPages}
        nodes={nodes}
        runningTitle={runningTitle}
        isEndCover={isEndCover}
        side={side}
        showGutterShadow={true}
      />
    );
  }
);

ReaderPage.displayName = "ReaderPage";
