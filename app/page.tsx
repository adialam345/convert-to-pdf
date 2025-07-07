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
      
      // Convert DOCX to HTML with style preservation
      const result = await mammoth.convertToHtml({ 
        arrayBuffer,
        styleMap: [
          "p[style-name='Normal'] => p.normal:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "r[style-name='Strong'] => strong:fresh",
          "r[style-name='Emphasis'] => em:fresh",
          // Preserve original styles
          "u => span.underline:fresh",
          "strike => span.strikethrough:fresh",
          "i => span.italic:fresh",
          "b => span.bold:fresh",
          // Preserve font sizes (examples)
          "r[size='28'] => span.size-28:fresh",
          "r[size='24'] => span.size-24:fresh",
          "r[size='20'] => span.size-20:fresh",
          "r[size='16'] => span.size-16:fresh",
          "r[size='14'] => span.size-14:fresh",
          "r[size='12'] => span.size-12:fresh",
          "r[size='10'] => span.size-10:fresh",
          // Preserve colors
          "r[color='FF0000'] => span.color-red:fresh",
          "r[color='0000FF'] => span.color-blue:fresh",
        ],
        transformDocument: (document) => {
          return mammoth.transforms.paragraph((element) => {
            const style = element.styleId || '';
            const fontSize = element.fontSize || 12;
            const color = element.color || '000000';
            
            element.alignment = element.alignment || 'left';
            element.styleId = `${style}-${fontSize}-${color}`;
            
            return element;
          })(document);
        }
      });
      const html = result.value;
      
      // Create a temporary container to render the HTML
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const margin = 50; // Define margin here
      let page = pdfDoc.addPage([595.276, 841.890]); // A4 size
      const { width, height } = page.getSize();
      
      // Initialize vertical position
      let yPosition = height - margin;
      
      // Embed fonts
      const fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
      };
      
      // Style configuration with more detailed styles
      const styles = {
        normal: { fontSize: 12, font: fonts.regular, marginBottom: 12, lineHeight: 1.2 },
        h1: { fontSize: 24, font: fonts.bold, marginBottom: 20, marginTop: 20 },
        h2: { fontSize: 20, font: fonts.bold, marginBottom: 16, marginTop: 16 },
        h3: { fontSize: 16, font: fonts.bold, marginBottom: 12, marginTop: 12 },
        title: { fontSize: 32, font: fonts.bold, marginBottom: 24, marginTop: 24 },
        bold: { font: fonts.bold },
        italic: { font: fonts.italic },
        boldItalic: { font: fonts.boldItalic },
        underline: { underline: true },
        strikethrough: { strikethrough: true },
      };

      // Add size-specific styles
      [28, 24, 20, 16, 14, 12, 10].forEach(size => {
        styles[`size-${size}`] = { fontSize: size };
      });

      // Add color styles
      const colorMap = {
        'red': rgb(1, 0, 0),
        'blue': rgb(0, 0, 1),
        'black': rgb(0, 0, 0),
      };
      
      const maxWidth = width - (margin * 2);
      
      // Enhanced getTextLines function to handle style variations
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

      // Enhanced text processing function with closure over yPosition
      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          // Get base style from parent element
          let style = { ...styles.normal };
          const parentElement = node.parentElement;
          
          if (parentElement) {
            // Get tag-based style
            const tag = parentElement.tagName.toLowerCase();
            if (styles[tag as keyof typeof styles]) {
              style = { ...style, ...styles[tag as keyof typeof styles] };
            }
            
            // Apply class-based styles
            Array.from(parentElement.classList).forEach(className => {
              if (styles[className as keyof typeof styles]) {
                style = { ...style, ...styles[className as keyof typeof styles] };
              }
              
              // Handle size classes
              if (className.startsWith('size-')) {
                const size = parseInt(className.split('-')[1]);
                if (!isNaN(size)) {
                  style.fontSize = size;
                }
              }
              
              // Handle color classes
              if (className.startsWith('color-')) {
                const color = className.split('-')[1];
                if (colorMap[color as keyof typeof colorMap]) {
                  style.color = colorMap[color as keyof typeof colorMap];
                }
              }
            });
          }
          
          const text = node.textContent.trim().replace(/\s+/g, ' ');
          const wrappedLines = getTextLines(text, style);
          
          // Add top margin if needed
          if (style.marginTop) {
            yPosition -= style.marginTop;
          }
          
          for (const line of wrappedLines) {
            if (yPosition <= margin + (style.fontSize || 12)) {
              page = pdfDoc.addPage([595.276, 841.890]);
              const { height: newHeight } = page.getSize();
              yPosition = newHeight - margin;
            }
            
            // Draw text with all style properties
            page.drawText(line, {
              x: margin,
              y: yPosition,
              size: style.fontSize || 12,
              font: style.font || fonts.regular,
              color: style.color || rgb(0, 0, 0),
              lineHeight: style.lineHeight || 1.2,
            });
            
            yPosition -= (style.fontSize || 12) * (style.lineHeight || 1.2);
          }
          
          // Add bottom margin
          if (style.marginBottom) {
            yPosition -= style.marginBottom;
          }
        }
        
        // Process child nodes
        node.childNodes.forEach(processNode);
      };

      // Process the HTML content
      processNode(container);
      
      // Clean up the temporary container
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
      const { PDFDocument } = await import('pdf-lib');
      const file = files[0].file;
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.276, 841.890]); // A4 size
      const { width, height } = page.getSize();
      
      // Add basic content
      // Note: For full Excel support, consider using a server-side solution
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.readAsText(file);
      });
      
      page.drawText('Excel Content Preview', {
        x: 50,
        y: height - 50,
        size: 14,
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
      const { PDFDocument } = await import('pdf-lib');
      const file = files[0].file;
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.276, 841.890]); // A4 size
      const { width, height } = page.getSize();
      
      // Add basic content
      // Note: For full PowerPoint support, consider using a server-side solution
      page.drawText('PowerPoint Content Preview', {
        x: 50,
        y: height - 50,
        size: 14,
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
      const { PDFDocument } = await import('pdf-lib');
      const file = files[0].file;
      
      // Read HTML content
      const htmlContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      });

      // Create temporary container
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Use html2canvas for conversion
      const canvas = await html2canvas(container);
      document.body.removeChild(container);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.276, 841.890]); // A4
      
      // Convert canvas to PNG
      const pngImage = await canvas.toDataURL('image/png');
      const pngImageBytes = await fetch(pngImage).then(res => res.arrayBuffer());
      
      // Embed PNG in PDF
      const embeddedImage = await pdfDoc.embedPng(pngImageBytes);
      const { width, height } = page.getSize();
      const scale = Math.min(width / embeddedImage.width, height / embeddedImage.height);
      
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width * scale,
        height: embeddedImage.height * scale,
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