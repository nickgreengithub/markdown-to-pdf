/* Entry for the vendored editor bundle. Everything the app needs from
   CodeMirror 6 and markdown-it is re-exported on two globals so the
   build-free app (plain <script> tags, Babel in the browser) can use them. */
import { EditorState, Compartment, StateField, StateEffect, RangeSet, RangeSetBuilder, Text, Prec, EditorSelection } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor,
  Decoration, WidgetType, ViewPlugin, hoverTooltip, showTooltip, gutter, GutterMarker, placeholder, rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle, syntaxTree, foldGutter, foldKeymap, indentOnInput, ensureSyntaxTree } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, startCompletion, closeCompletion } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches, search } from '@codemirror/search';
import { tags } from '@lezer/highlight';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';

window.CM = {
  EditorState, Compartment, StateField, StateEffect, RangeSet, RangeSetBuilder, Text, Prec, EditorSelection,
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor,
  Decoration, WidgetType, ViewPlugin, hoverTooltip, showTooltip, gutter, GutterMarker, placeholder, rectangularSelection,
  defaultKeymap, history, historyKeymap, indentWithTab, undo, redo,
  markdown, markdownLanguage, markdownKeymap,
  syntaxHighlighting, HighlightStyle, syntaxTree, foldGutter, foldKeymap, indentOnInput, ensureSyntaxTree,
  autocompletion, completionKeymap, closeBrackets, startCompletion, closeCompletion,
  searchKeymap, highlightSelectionMatches, search,
  tags,
};
window.markdownit = MarkdownIt;
window.markdownitFootnote = footnote;
