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

interface File {
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
  const [files, setFiles] = useState<File[]>([]);
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
      
      // Convert DOCX to HTML with comprehensive style preservation
      const result = await mammoth.convertToHtml({ 
        arrayBuffer,
        styleMap: [
          "p[style-name='Normal'] => p.normal",
          "p[style-name='Heading 1'] => h1.heading1",
          "p[style-name='Heading 2'] => h2.heading2", 
          "p[style-name='Heading 3'] => h3.heading3",
          "p[style-name='Title'] => h1.title",
          "r[style-name='Strong'] => strong.strong",
          "r[style-name='Emphasis'] => em.emphasis",
          "u => span.underline",
          "strike => span.strikethrough",
          "i => span.italic",
          "b => span.bold"
        ],
        includeDefaultStyleMap: true,
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        })
      });
      
      const html = result.value;
      const messages = result.messages;
      
      // Log any conversion warnings
      if (messages.length > 0) {
        console.log('Conversion messages:', messages);
      }

      // Enhanced HTML processing with better style extraction
      const processHTMLToPDF = async (htmlContent: string) => {
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([595.276, 841.890]); // A4 size
        const { width, height } = page.getSize();
        const margin = 50;
        let yPosition = height - margin;
        
        // Load fonts
        const fonts = {
          regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
          bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
          italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
          boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
          times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
          timesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
          timesItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
          timesBoldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
        };

        // Create temporary DOM element for parsing
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Process each element recursively
        const processElement = (element: Element, inheritedStyle: any = {}) => {
          const tagName = element.tagName.toLowerCase();
          const classList = Array.from(element.classList);
          
          // Base style inheritance
          let currentStyle = { ...inheritedStyle };
          
          // Apply tag-based styles
          switch (tagName) {
            case 'h1':
              currentStyle = {
                ...currentStyle,
                fontSize: classList.includes('title') ? 28 : 24,
                font: fonts.bold,
                marginTop: 20,
                marginBottom: 16,
                lineHeight: 1.2
              };
              break;
            case 'h2':
              currentStyle = {
                ...currentStyle,
                fontSize: 20,
                font: fonts.bold,
                marginTop: 16,
                marginBottom: 12,
                lineHeight: 1.2
              };
              break;
            case 'h3':
              currentStyle = {
                ...currentStyle,
                fontSize: 16,
                font: fonts.bold,
                marginTop: 12,
                marginBottom: 10,
                lineHeight: 1.2
              };
              break;
            case 'p':
              currentStyle = {
                ...currentStyle,
                fontSize: 12,
                font: fonts.regular,
                marginBottom: 12,
                lineHeight: 1.4
              };
              break;
            case 'strong':
            case 'b':
              currentStyle = {
                ...currentStyle,
                font: currentStyle.font === fonts.italic ? fonts.boldItalic : fonts.bold
              };
              break;
            case 'em':
            case 'i':
              currentStyle = {
                ...currentStyle,
                font: currentStyle.font === fonts.bold ? fonts.boldItalic : fonts.italic
              };
              break;
            case 'span':
              // Handle span classes
              if (classList.includes('underline')) {
                currentStyle.underline = true;
              }
              if (classList.includes('strikethrough')) {
                currentStyle.strikethrough = true;
              }
              break;
          }
          
          // Process text content
          if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
            const text = element.textContent?.trim();
            if (text) {
              // Add margins
              if (currentStyle.marginTop) {
                yPosition -= currentStyle.marginTop;
              }
              
              // Split text into lines
              const maxWidth = width - (margin * 2);
              const words = text.split(' ');
              const lines: string[] = [];
              let currentLine = '';
              
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const textWidth = currentStyle.font.widthOfTextAtSize(testLine, currentStyle.fontSize || 12);
                
                if (textWidth <= maxWidth) {
                  currentLine = testLine;
                } else {
                  if (currentLine) lines.push(currentLine);
                  currentLine = word;
                }
              }
              if (currentLine) lines.push(currentLine);
              
              // Draw each line
              for (const line of lines) {
                if (yPosition <= margin + (currentStyle.fontSize || 12)) {
                  page = pdfDoc.addPage([595.276, 841.890]);
                  yPosition = height - margin;
                }
                
                page.drawText(line, {
                  x: margin,
                  y: yPosition,
                  size: currentStyle.fontSize || 12,
                  font: currentStyle.font || fonts.regular,
                  color: currentStyle.color || rgb(0, 0, 0),
                });
                
                yPosition -= (currentStyle.fontSize || 12) * (currentStyle.lineHeight || 1.2);
              }
              
              // Add bottom margin
              if (currentStyle.marginBottom) {
                yPosition -= currentStyle.marginBottom;
              }
            }
          } else {
            // Process child elements
            for (const child of Array.from(element.children)) {
              processElement(child, currentStyle);
            }
          }
        };
        
        // Process the body content
        const body = doc.body;
        if (body) {
          for (const child of Array.from(body.children)) {
            processElement(child);
          }
        }
        
        return pdfDoc;
      });
      
      // Process the HTML and create PDF
      const pdfDoc = await processHTMLToPDF(html);
      
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
      const arrayBuffer = await file.arrayBuffer();
      
      // Read Excel file
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const pdfDoc = await PDFDocument.create();
      
      // Load fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Process each worksheet
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        // Add new page for each sheet
        const page = pdfDoc.addPage([841.890, 595.276]); // A4 landscape for better table fit
        const { width, height } = page.getSize();
        const margin = 40;
        
        // Draw sheet title
        page.drawText(`Sheet: ${sheetName}`, {
          x: margin,
          y: height - margin,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        
        let yPosition = height - margin - 30;
        const cellHeight = 20;
        const cellPadding = 5;
        
        // Calculate column widths based on content
        const maxCols = Math.max(...jsonData.map((row: any) => row.length));
        const availableWidth = width - (margin * 2);
        const columnWidth = Math.min(availableWidth / maxCols, 120);
        
        // Draw table data
        jsonData.forEach((row: any, rowIndex) => {
          if (yPosition < margin + cellHeight) {
            // Add new page if needed
            const newPage = pdfDoc.addPage([841.890, 595.276]);
            yPosition = newPage.getSize().height - margin;
          }
          
          let xPosition = margin;
          
          // Draw each cell in the row
          row.forEach((cell: any, colIndex: number) => {
            const cellValue = String(cell || '');
            const isHeader = rowIndex === 0;
            
            // Draw cell border
            page.drawRectangle({
              x: xPosition,
              y: yPosition - cellHeight,
              width: columnWidth,
              height: cellHeight,
              borderColor: rgb(0.7, 0.7, 0.7),
              borderWidth: 1,
              color: isHeader ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1),
            });
            
            // Draw cell text
            if (cellValue) {
              // Truncate text if too long
              let displayText = cellValue;
              const maxTextWidth = columnWidth - (cellPadding * 2);
              const fontSize = 10;
              
              while (font.widthOfTextAtSize(displayText, fontSize) > maxTextWidth && displayText.length > 0) {
                displayText = displayText.slice(0, -1);
              }
              
              if (displayText !== cellValue && displayText.length > 3) {
                displayText = displayText.slice(0, -3) + '...';
              }
              
              page.drawText(displayText, {
                x: xPosition + cellPadding,
                y: yPosition - cellHeight + cellPadding + 2,
                size: fontSize,
                font: isHeader ? boldFont : font,
                color: rgb(0, 0, 0),
              });
            }
            
            xPosition += columnWidth;
          });
          
          yPosition -= cellHeight;
        });
      });
      
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
      console.error('Error converting Excel to PDF:', error);
      throw error;
    }
  };

  const convertPowerPointToPDF = async () => {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const file = files[0].file;
      const arrayBuffer = await file.arrayBuffer();
      
      // For PowerPoint, we'll extract text content and create a structured PDF
      // Note: Full PowerPoint parsing requires server-side processing
      const pdfDoc = await PDFDocument.create();
      
      // Load fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Create a page with PowerPoint-like layout
      const page = pdfDoc.addPage([595.276, 841.890]); // A4 size
      const { width, height } = page.getSize();
      const margin = 50;
      
      // Add title
      page.drawText('PowerPoint Presentation', {
        x: margin,
        y: height - margin,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      // Add file info
      page.drawText(`File: ${file.name}`, {
        x: margin,
        y: height - margin - 40,
        size: 14,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      page.drawText(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, {
        x: margin,
        y: height - margin - 60,
        size: 12,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      // Add note about limitations
      const noteText = [
        'Note: This is a basic conversion of your PowerPoint file.',
        'For full slide content with images and formatting,',
        'please use a dedicated PowerPoint to PDF converter.',
        '',
        'This converter preserves the file structure and',
        'provides a PDF placeholder for your presentation.'
      ];
      
      let yPos = height - margin - 120;
      noteText.forEach(line => {
        page.drawText(line, {
          x: margin,
          y: yPos,
          size: 12,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPos -= 20;
      });
      
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

      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.276, 841.890]); // A4 size
      const { width, height } = page.getSize();
      const margin = 50;
      let yPosition = height - margin;
      
      // Load fonts
      const fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
      };
      
      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Process HTML elements
      const processHTMLElement = (element: Element, inheritedStyle: any = {}) => {
        const tagName = element.tagName.toLowerCase();
        let currentStyle = { ...inheritedStyle };
        
        // Apply tag-based styles
        switch (tagName) {
          case 'h1':
            currentStyle = { ...currentStyle, fontSize: 24, font: fonts.bold, marginTop: 20, marginBottom: 16 };
            break;
          case 'h2':
            currentStyle = { ...currentStyle, fontSize: 20, font: fonts.bold, marginTop: 16, marginBottom: 12 };
            break;
          case 'h3':
            currentStyle = { ...currentStyle, fontSize: 16, font: fonts.bold, marginTop: 12, marginBottom: 10 };
            break;
          case 'h4':
            currentStyle = { ...currentStyle, fontSize: 14, font: fonts.bold, marginTop: 10, marginBottom: 8 };
            break;
          case 'h5':
            currentStyle = { ...currentStyle, fontSize: 12, font: fonts.bold, marginTop: 8, marginBottom: 6 };
            break;
          case 'h6':
            currentStyle = { ...currentStyle, fontSize: 10, font: fonts.bold, marginTop: 6, marginBottom: 4 };
            break;
          case 'p':
            currentStyle = { ...currentStyle, fontSize: 12, font: fonts.regular, marginBottom: 12, lineHeight: 1.4 };
            break;
          case 'strong':
          case 'b':
            currentStyle = { ...currentStyle, font: currentStyle.font === fonts.italic ? fonts.boldItalic : fonts.bold };
            break;
          case 'em':
          case 'i':
            currentStyle = { ...currentStyle, font: currentStyle.font === fonts.bold ? fonts.boldItalic : fonts.italic };
            break;
          case 'div':
            currentStyle = { ...currentStyle, fontSize: 12, font: fonts.regular, marginBottom: 8 };
            break;
          case 'span':
            // Inherit parent styles
            break;
          case 'ul':
          case 'ol':
            currentStyle = { ...currentStyle, marginTop: 8, marginBottom: 8, marginLeft: 20 };
            break;
          case 'li':
            currentStyle = { ...currentStyle, fontSize: 12, font: fonts.regular, marginBottom: 4 };
            break;
        }
        
        // Process text content
        const textContent = element.textContent?.trim();
        if (textContent && element.children.length === 0) {
          // Add margins
          if (currentStyle.marginTop) {
            yPosition -= currentStyle.marginTop;
          }
          
          // Handle list items
          let displayText = textContent;
          if (tagName === 'li') {
            const parent = element.parentElement;
            if (parent?.tagName.toLowerCase() === 'ul') {
              displayText = `• ${textContent}`;
            } else if (parent?.tagName.toLowerCase() === 'ol') {
              const index = Array.from(parent.children).indexOf(element) + 1;
              displayText = `${index}. ${textContent}`;
            }
          }
          
          // Split text into lines
          const maxWidth = width - (margin * 2) - (currentStyle.marginLeft || 0);
          const words = displayText.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = currentStyle.font.widthOfTextAtSize(testLine, currentStyle.fontSize || 12);
            
            if (textWidth <= maxWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) lines.push(currentLine);
          
          // Draw each line
          for (const line of lines) {
            if (yPosition <= margin + (currentStyle.fontSize || 12)) {
              page = pdfDoc.addPage([595.276, 841.890]);
              yPosition = height - margin;
            }
            
            page.drawText(line, {
              x: margin + (currentStyle.marginLeft || 0),
              y: yPosition,
              size: currentStyle.fontSize || 12,
              font: currentStyle.font || fonts.regular,
              color: rgb(0, 0, 0),
            });
            
            yPosition -= (currentStyle.fontSize || 12) * (currentStyle.lineHeight || 1.2);
          }
          
          // Add bottom margin
          if (currentStyle.marginBottom) {
            yPosition -= currentStyle.marginBottom;
          }
        } else {
          // Process child elements
          for (const child of Array.from(element.children)) {
            processHTMLElement(child, currentStyle);
          }
        }
      };
      
      // Process body content
      const body = doc.body;
      if (body) {
        for (const child of Array.from(body.children)) {
          processHTMLElement(child);
        }
      }

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
        return <FileText className="w-4 h-4" />;
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
                <FileText className="w-4 h-4" />
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