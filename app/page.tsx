"use client";

import { useState, useCallback, useRef } from 'react';
import { Upload, Download, X, FileImage, Settings, Zap, Sparkles, FileText, FileSpreadsheet, FilePresentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast";
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
    // Implementasi konversi Word ke PDF akan ditambahkan
    const docxPdf = require('docx-pdf');
    const file = files[0].file;
    const reader = new FileReader();

    reader.onload = async (e) => {
      const buffer = e.target?.result;
      if (buffer) {
        const outputPath = 'converted-word.pdf';
        await docxPdf(buffer, outputPath);
        // Trigger download
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const convertExcelToPDF = async () => {
    // Implementasi konversi Excel ke PDF akan ditambahkan
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const file = files[0].file;

    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    // Convert to PDF using PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    // Implementasi konversi worksheet ke PDF
    doc.pipe(require('fs').createWriteStream('converted-excel.pdf'));
    doc.end();
  };

  const convertPowerPointToPDF = async () => {
    // Implementasi konversi PowerPoint ke PDF akan ditambahkan
    const pptxgen = require('pptxgenjs');
    const pres = new pptxgen();
    const file = files[0].file;

    // Load and convert
    const buffer = await file.arrayBuffer();
    // Implementasi konversi ke PDF
  };

  const convertHTMLToPDF = async () => {
    // Implementasi konversi HTML ke PDF akan ditambahkan
    const htmlPdf = require('html-pdf-node');
    const file = files[0].file;
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result;
      if (content) {
        const options = { format: 'A4' };
        const pdf = await htmlPdf.generatePdf({ content }, options);
        // Trigger download
      }
    };

    reader.readAsText(file);
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
        return <FilePresentation className="w-4 h-4" />;
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
                <FilePresentation className="w-4 h-4" />
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