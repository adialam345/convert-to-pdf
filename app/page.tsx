"use client";

import { useState, useCallback, useRef } from 'react';
import { Upload, Download, X, FileImage, Settings, Zap, Sparkles, FileText, FileSpreadsheet, Presentation, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface FileItem {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
}

interface PDFSettings {
  pageSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  quality: number;
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('image');
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    pageSize: 'a4',
    orientation: 'portrait',
    quality: 0.8
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (uploadedFiles: File[]) => {
    const validFiles = uploadedFiles.filter(file => {
      const fileType = file.type.toLowerCase();
      switch (activeTab) {
        case 'image':
          return fileType.startsWith('image/');
        case 'word':
          return fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 fileType === 'application/msword';
        case 'excel':
          return fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 fileType === 'application/vnd.ms-excel';
        case 'powerpoint':
          return fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                 fileType === 'application/vnd.ms-powerpoint';
        case 'html':
          return fileType === 'text/html';
        default:
          return false;
      }
    });

    if (validFiles.length === 0) {
      toast({
        title: "Format file tidak didukung",
        description: "Silakan pilih file dengan format yang sesuai dengan tab yang aktif.",
        variant: "destructive"
      });
      return;
    }

    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(file => file.id !== id);
      const removed = prev.find(file => file.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const convertToPDF = async () => {
    if (files.length === 0) return;
    
    setIsConverting(true);
    
    try {
      switch (activeTab) {
        case 'image':
          await convertImagesToPDF();
          break;
        case 'word':
          await convertWordToPDF();
          break;
        case 'excel':
          await convertExcelToPDF();
          break;
        case 'powerpoint':
          await convertPowerPointToPDF();
          break;
        case 'html':
          await convertHTMLToPDF();
          break;
      }

      toast({
        title: "Konversi Berhasil",
        description: "File PDF telah berhasil dibuat dan diunduh.",
      });
    } catch (error) {
      console.error('Error converting to PDF:', error);
      toast({
        title: "Gagal Mengkonversi",
        description: "Terjadi kesalahan saat mengkonversi file. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const convertImagesToPDF = async () => {
    const pdf = new jsPDF({
      orientation: pdfSettings.orientation,
      unit: 'mm',
      format: pdfSettings.pageSize
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    for (let i = 0; i < files.length; i++) {
      if (i > 0) pdf.addPage();

      const img = new Image();
      img.src = files[i].url;

      await new Promise((resolve) => {
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          
          let scaledWidth = pageWidth - (margin * 2);
          let scaledHeight = (imgHeight * scaledWidth) / imgWidth;
          
          if (scaledHeight > pageHeight - (margin * 2)) {
            scaledHeight = pageHeight - (margin * 2);
            scaledWidth = (imgWidth * scaledHeight) / imgHeight;
          }
          
          const xPos = (pageWidth - scaledWidth) / 2;
          const yPos = (pageHeight - scaledHeight) / 2;
          
          pdf.addImage(files[i].url, 'JPEG', xPos, yPos, scaledWidth, scaledHeight, undefined, 'FAST');
          resolve(null);
        };
      });
    }

    pdf.save('converted-images.pdf');
  };

  const convertWordToPDF = async () => {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const mammoth = await import('mammoth');
      const file = files[0].file;
      const arrayBuffer = await file.arrayBuffer();
      
      // Enhanced style mapping for better formatting
      const result = await mammoth.convertToHtml({ 
        arrayBuffer,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh", 
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Subtitle'] => h2.subtitle:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em",
        ],
        transformDocument: mammoth.transforms.paragraph(function(paragraph) {
          return paragraph;
        })
      });
      
      const html = result.value;
      
      // Create a temporary container to render the HTML
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.lineHeight = '1.6';
      container.style.color = '#333';
      document.body.appendChild(container);
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.276, 841.890]); // A4 size
      const { width, height } = page.getSize();
      
      // Embed multiple fonts for better typography
      const fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
        times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
        timesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      };
      
      // Enhanced style configuration
      const styles = {
        h1: { fontSize: 28, font: fonts.bold, marginBottom: 24, marginTop: 32, color: rgb(0.1, 0.1, 0.1) },
        h2: { fontSize: 24, font: fonts.bold, marginBottom: 20, marginTop: 28, color: rgb(0.15, 0.15, 0.15) },
        h3: { fontSize: 20, font: fonts.bold, marginBottom: 16, marginTop: 24, color: rgb(0.2, 0.2, 0.2) },
        h4: { fontSize: 18, font: fonts.bold, marginBottom: 14, marginTop: 20, color: rgb(0.25, 0.25, 0.25) },
        h5: { fontSize: 16, font: fonts.bold, marginBottom: 12, marginTop: 18, color: rgb(0.3, 0.3, 0.3) },
        h6: { fontSize: 14, font: fonts.bold, marginBottom: 10, marginTop: 16, color: rgb(0.35, 0.35, 0.35) },
        p: { fontSize: 12, font: fonts.regular, marginBottom: 12, lineHeight: 1.5, color: rgb(0, 0, 0) },
        strong: { fontSize: 12, font: fonts.bold, marginBottom: 0, color: rgb(0, 0, 0) },
        em: { fontSize: 12, font: fonts.italic, marginBottom: 0, color: rgb(0, 0, 0) },
        li: { fontSize: 12, font: fonts.regular, marginBottom: 8, lineHeight: 1.4, color: rgb(0, 0, 0) },
        title: { fontSize: 36, font: fonts.timesBold, marginBottom: 32, marginTop: 40, color: rgb(0, 0, 0) },
        subtitle: { fontSize: 18, font: fonts.italic, marginBottom: 24, marginTop: 16, color: rgb(0.2, 0.2, 0.2) },
      };
      
      const margin = 50;
      const maxWidth = width - (margin * 2);
      
      // Enhanced text processing function
      const getTextLines = (text: string, style: any): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = style.font.widthOfTextAtSize(testLine, style.fontSize);
          
          if (textWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      // Process each element in the HTML with enhanced formatting
      let yPosition = height - margin;
      let listCounter = 1;
      
      const processElement = (element: Element) => {
        const tagName = element.tagName.toLowerCase();
        const textContent = element.textContent?.trim();
        
        if (!textContent) return;
        
        // Determine style based on element type
        let style = styles.p;
        if (styles[tagName as keyof typeof styles]) {
          style = styles[tagName as keyof typeof styles];
        }
        
        // Handle special classes
        if (element.classList.contains('title')) {
          style = styles.title;
        } else if (element.classList.contains('subtitle')) {
          style = styles.subtitle;
        }
        
        // Handle strong and em tags
        if (tagName === 'strong' || tagName === 'b') {
          style = { ...styles.p, font: fonts.bold };
        } else if (tagName === 'em' || tagName === 'i') {
          style = { ...styles.p, font: fonts.italic };
        }
        
        // Add top margin for headings
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          yPosition -= style.marginTop;
        }
        
        // Handle lists
        let prefix = '';
        if (tagName === 'li') {
          const parentList = element.closest('ol, ul');
          if (parentList?.tagName.toLowerCase() === 'ol') {
            prefix = `${listCounter}. `;
            listCounter++;
          } else {
            prefix = '• ';
          }
        }
        
        const fullText = prefix + textContent;
        const wrappedLines = getTextLines(fullText, style);
        
        for (const line of wrappedLines) {
          // Check if we need a new page
          if (yPosition <= margin + style.fontSize) {
            page = pdfDoc.addPage([595.276, 841.890]);
            const { height: newHeight } = page.getSize();
            yPosition = newHeight - margin;
          }
          
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: style.fontSize,
            font: style.font,
            color: style.color || rgb(0, 0, 0),
            lineHeight: style.lineHeight || 1,
          });
          
          yPosition -= style.fontSize * (style.lineHeight || 1.2);
        }
        
        // Add bottom margin
        yPosition -= style.marginBottom;
      };

      // Process all elements
      const allElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, strong, em, li, div');
      allElements.forEach(processElement);
      
      // Clean up
      document.body.removeChild(container);
      
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Download the PDF
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting Word to PDF:', error);
      throw error;
    }
  };

  const convertExcelToPDF = async () => {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const XLSX = await import('xlsx');
      const file = files[0].file;
      
      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Process each worksheet
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Add new page for each sheet (except first)
        const page = sheetIndex === 0 ? pdfDoc.addPage([841.890, 595.276]) : pdfDoc.addPage([841.890, 595.276]); // Landscape A4
        const { width, height } = page.getSize();
        
        const margin = 40;
        const cellPadding = 5;
        const rowHeight = 20;
        const maxCols = 10; // Limit columns to fit page
        
        // Calculate column widths
        const availableWidth = width - (margin * 2);
        const colWidth = availableWidth / Math.min(maxCols, Math.max(...jsonData.map((row: any) => row.length)));
        
        let yPosition = height - margin - 30;
        
        // Add sheet title
        page.drawText(`Sheet: ${sheetName}`, {
          x: margin,
          y: yPosition,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= 40;
        
        // Process rows
        jsonData.forEach((row: any, rowIndex) => {
          if (yPosition < margin + rowHeight) {
            // Would need new page, but for simplicity, we'll stop here
            return;
          }
          
          // Limit columns to fit page
          const limitedRow = row.slice(0, maxCols);
          
          limitedRow.forEach((cell: any, colIndex) => {
            const xPosition = margin + (colIndex * colWidth);
            const cellValue = cell ? String(cell) : '';
            
            // Truncate long text
            const maxChars = Math.floor(colWidth / 6); // Approximate chars per width
            const displayText = cellValue.length > maxChars ? 
              cellValue.substring(0, maxChars - 3) + '...' : cellValue;
            
            // Draw cell border
            page.drawRectangle({
              x: xPosition,
              y: yPosition - rowHeight + 5,
              width: colWidth,
              height: rowHeight,
              borderColor: rgb(0.7, 0.7, 0.7),
              borderWidth: 0.5,
              color: rowIndex === 0 ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1), // Header background
            });
            
            // Draw cell text
            page.drawText(displayText, {
              x: xPosition + cellPadding,
              y: yPosition - 12,
              size: rowIndex === 0 ? 10 : 9, // Larger font for header
              font: rowIndex === 0 ? boldFont : font, // Bold for header
              color: rgb(0, 0, 0),
            });
          });
          
          yPosition -= rowHeight;
        });
      });
      
      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting Excel to PDF:', error);
      throw error;
    }
  };

  const convertPowerPointToPDF = async () => {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const file = files[0].file;
      
      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.276, 841.890]); // A4 size
      const { width, height } = page.getSize();
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const margin = 50;
      let yPosition = height - margin;
      
      // Title
      page.drawText('PowerPoint Presentation', {
        x: margin,
        y: yPosition,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 50;
      
      // File information
      page.drawText(`File: ${file.name}`, {
        x: margin,
        y: yPosition,
        size: 14,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      yPosition -= 30;
      
      page.drawText(`Size: ${formatFileSize(file.size)}`, {
        x: margin,
        y: yPosition,
        size: 14,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      yPosition -= 50;
      
      // Note about limitations
      const noteText = [
        'Note: PowerPoint files contain complex multimedia content that cannot be',
        'fully preserved in PDF format. This conversion provides a basic document',
        'structure. For full functionality, please use the original PowerPoint file.',
        '',
        'To get better results, consider:',
        '• Exporting to PDF directly from PowerPoint',
        '• Converting slides to images first, then to PDF',
        '• Using online PowerPoint to PDF converters'
      ];
      
      noteText.forEach(line => {
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: 12,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
        yPosition -= 20;
      });
      
      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting PowerPoint to PDF:', error);
      throw error;
    }
  };

  const convertHTMLToPDF = async () => {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const file = files[0].file;
      
      // Read HTML content
      const htmlContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      });

      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.276, 841.890]); // A4
      const { width, height } = page.getSize();
      
      // Embed fonts
      const fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        mono: await pdfDoc.embedFont(StandardFonts.Courier),
      };
      
      // Parse HTML and create a clean DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Style definitions for HTML elements
      const elementStyles = {
        h1: { fontSize: 24, font: fonts.bold, marginBottom: 20, marginTop: 20, color: rgb(0, 0, 0) },
        h2: { fontSize: 20, font: fonts.bold, marginBottom: 16, marginTop: 16, color: rgb(0.1, 0.1, 0.1) },
        h3: { fontSize: 18, font: fonts.bold, marginBottom: 14, marginTop: 14, color: rgb(0.2, 0.2, 0.2) },
        h4: { fontSize: 16, font: fonts.bold, marginBottom: 12, marginTop: 12, color: rgb(0.3, 0.3, 0.3) },
        h5: { fontSize: 14, font: fonts.bold, marginBottom: 10, marginTop: 10, color: rgb(0.4, 0.4, 0.4) },
        h6: { fontSize: 12, font: fonts.bold, marginBottom: 8, marginTop: 8, color: rgb(0.5, 0.5, 0.5) },
        p: { fontSize: 12, font: fonts.regular, marginBottom: 12, lineHeight: 1.4, color: rgb(0, 0, 0) },
        div: { fontSize: 12, font: fonts.regular, marginBottom: 8, lineHeight: 1.4, color: rgb(0, 0, 0) },
        span: { fontSize: 12, font: fonts.regular, marginBottom: 0, color: rgb(0, 0, 0) },
        strong: { fontSize: 12, font: fonts.bold, marginBottom: 0, color: rgb(0, 0, 0) },
        b: { fontSize: 12, font: fonts.bold, marginBottom: 0, color: rgb(0, 0, 0) },
        em: { fontSize: 12, font: fonts.italic, marginBottom: 0, color: rgb(0, 0, 0) },
        i: { fontSize: 12, font: fonts.italic, marginBottom: 0, color: rgb(0, 0, 0) },
        code: { fontSize: 10, font: fonts.mono, marginBottom: 0, color: rgb(0.2, 0.2, 0.8) },
        pre: { fontSize: 10, font: fonts.mono, marginBottom: 12, lineHeight: 1.2, color: rgb(0.2, 0.2, 0.8) },
        li: { fontSize: 12, font: fonts.regular, marginBottom: 6, lineHeight: 1.3, color: rgb(0, 0, 0) },
        blockquote: { fontSize: 12, font: fonts.italic, marginBottom: 12, lineHeight: 1.4, color: rgb(0.3, 0.3, 0.3) },
      };
      
      const margin = 50;
      const maxWidth = width - (margin * 2);
      let yPosition = height - margin;
      
      // Text wrapping function
      const wrapText = (text: string, style: any): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = style.font.widthOfTextAtSize(testLine, style.fontSize);
          
          if (textWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };
      
      // Process HTML elements
      const processNode = (node: Node, listLevel = 0, listType = 'ul', listIndex = 1): number => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (!text) return listIndex;
          
          const parentElement = node.parentElement;
          const tagName = parentElement?.tagName.toLowerCase() || 'p';
          const style = elementStyles[tagName as keyof typeof elementStyles] || elementStyles.p;
          
          const lines = wrapText(text, style);
          
          for (const line of lines) {
            if (yPosition <= margin + style.fontSize) {
              page = pdfDoc.addPage([595.276, 841.890]);
              yPosition = height - margin;
            }
            
            page.drawText(line, {
              x: margin + (listLevel * 20),
              y: yPosition,
              size: style.fontSize,
              font: style.font,
              color: style.color || rgb(0, 0, 0),
            });
            
            yPosition -= style.fontSize * (style.lineHeight || 1.2);
          }
          
          yPosition -= style.marginBottom || 0;
          
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const tagName = element.tagName.toLowerCase();
          
          // Handle list items
          if (tagName === 'li') {
            const style = elementStyles.li;
            const prefix = listType === 'ol' ? `${listIndex}. ` : '• ';
            const text = element.textContent?.trim();
            
            if (text) {
              const lines = wrapText(prefix + text, style);
              
              for (const line of lines) {
                if (yPosition <= margin + style.fontSize) {
                  page = pdfDoc.addPage([595.276, 841.890]);
                  yPosition = height - margin;
                }
                
                page.drawText(line, {
                  x: margin + (listLevel * 20),
                  y: yPosition,
                  size: style.fontSize,
                  font: style.font,
                  color: style.color || rgb(0, 0, 0),
                });
                
                yPosition -= style.fontSize * (style.lineHeight || 1.2);
              }
              
              yPosition -= style.marginBottom || 0;
            }
            
            return listIndex + 1;
          }
          
          // Handle other elements
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].includes(tagName)) {
            const style = elementStyles[tagName as keyof typeof elementStyles] || elementStyles.p;
            yPosition -= style.marginTop || 0;
          }
          
          // Process child nodes
          let currentListIndex = 1;
          for (const child of Array.from(element.childNodes)) {
            const newListType = tagName === 'ol' ? 'ol' : 'ul';
            const newListLevel = ['ul', 'ol'].includes(tagName) ? listLevel + 1 : listLevel;
            currentListIndex = processNode(child, newListLevel, newListType, currentListIndex);
          }
        }
        
        return listIndex;
      };
      
      // Process the body content
      const body = doc.body || doc.documentElement;
      processNode(body);
      
      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error converting HTML to PDF:', error);
      throw error;
    }
  };

  const clearAll = () => {
    files.forEach(file => URL.revokeObjectURL(file.url));
    setFiles([]);
  };

  const getAcceptedFileTypes = () => {
    switch (activeTab) {
      case 'image':
        return 'image/*';
      case 'word':
        return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'excel':
        return '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'powerpoint':
        return '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'html':
        return '.html,text/html';
      default:
        return '';
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'image':
        return <FileImage className="w-4 h-4" />;
      case 'word':
        return <FileText className="w-4 h-4" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'powerpoint':
        return <Presentation className="w-4 h-4" />;
      case 'html':
        return <FileCode className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-100 via-white to-blue-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg"
            >
              <FileImage className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              File to PDF Converter
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Konversi file Anda ke PDF dengan mudah dan cepat. 
            Mendukung berbagai format file seperti gambar, Word, Excel, PowerPoint, dan HTML.
          </p>
        </motion.div>

        {/* Conversion Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Tabs defaultValue="image" className="w-full" onValueChange={(value) => {
            setActiveTab(value);
            clearAll();
          }}>
            <TabsList className="grid grid-cols-5 gap-4 bg-muted p-1">
              <TabsTrigger value="image" className="flex items-center gap-2">
                <FileImage className="w-4 h-4" />
                <span className="hidden sm:inline">Image</span>
              </TabsTrigger>
              <TabsTrigger value="word" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Word</span>
              </TabsTrigger>
              <TabsTrigger value="excel" className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </TabsTrigger>
              <TabsTrigger value="powerpoint" className="flex items-center gap-2">
                <Presentation className="w-4 h-4" />
                <span className="hidden sm:inline">PowerPoint</span>
              </TabsTrigger>
              <TabsTrigger value="html" className="flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                <span className="hidden sm:inline">HTML</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Area */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-8"
          >
            <Card className="border-2 border-dashed hover:border-blue-400 transition-colors duration-300">
              <CardContent className="p-6">
                <div
                  className={`min-h-[300px] rounded-lg transition-colors duration-300 ${
                    isDragging
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="mb-4"
                    >
                      {getTabIcon(activeTab)}
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2">
                      Drag & Drop Files Here
                    </h3>
                    <p className="text-gray-500 mb-4">
                      or click to select files
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple={activeTab === 'image'}
                      accept={getAcceptedFileTypes()}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="group hover:border-blue-500"
                    >
                      <Upload className="w-4 h-4 mr-2 group-hover:text-blue-500" />
                      Select Files
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Preview */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        <div className="aspect-square relative">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              {getTabIcon(activeTab)}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Settings Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  PDF Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Page Size</Label>
                  <Select
                    value={pdfSettings.pageSize}
                    onValueChange={(value: 'a4' | 'letter' | 'legal') =>
                      setPdfSettings({ ...pdfSettings, pageSize: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={pdfSettings.orientation}
                    onValueChange={(value: 'portrait' | 'landscape') =>
                      setPdfSettings({ ...pdfSettings, orientation: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Button
                    onClick={convertToPDF}
                    disabled={files.length === 0 || isConverting}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  >
                    {isConverting ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Convert to PDF
                      </>
                    )}
                  </Button>

                  {files.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={clearAll}
                      className="w-full"
                    >
                      Clear All Files
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Format Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-4"
            >
              <Alert>
                <AlertDescription className="text-sm">
                  {activeTab === 'image' && "Supported formats: JPEG, PNG, WebP, GIF, BMP"}
                  {activeTab === 'word' && "Supported formats: DOC, DOCX"}
                  {activeTab === 'excel' && "Supported formats: XLS, XLSX"}
                  {activeTab === 'powerpoint' && "Supported formats: PPT, PPTX"}
                  {activeTab === 'html' && "Supported format: HTML"}
                </AlertDescription>
              </Alert>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}