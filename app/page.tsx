"use client";

import { useState, useCallback, useRef } from 'react';
import { Upload, Download, X, FileImage, Settings, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

interface PDFSettings {
  pageSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  quality: number;
}

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    pageSize: 'a4',
    orientation: 'portrait',
    quality: 0.8
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      addImages(imageFiles);
    }
  }, []);

  const addImages = (files: File[]) => {
    const newImages: ImageFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    
    setImages(prev => [...prev, ...newImages]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addImages(files);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // Clean up object URLs
      const removed = prev.find(img => img.id === id);
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
    if (images.length === 0) return;
    
    setIsConverting(true);
    
    try {
      const pdf = new jsPDF({
        orientation: pdfSettings.orientation,
        unit: 'mm',
        format: pdfSettings.pageSize
      });

      // Get page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Add new page for each image except the first
        if (i > 0) {
          pdf.addPage();
        }
        
        // Create image element to get dimensions
        const img = new Image();
        img.src = image.url;
        
        await new Promise((resolve) => {
          img.onload = () => {
            const imgWidth = img.width;
            const imgHeight = img.height;
            
            // Calculate scaling to fit page with margins
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - (margin * 2);
            
            let scaledWidth = availableWidth;
            let scaledHeight = (imgHeight * availableWidth) / imgWidth;
            
            // If height is too large, scale by height instead
            if (scaledHeight > availableHeight) {
              scaledHeight = availableHeight;
              scaledWidth = (imgWidth * availableHeight) / imgHeight;
            }
            
            // Center the image
            const xPos = (pageWidth - scaledWidth) / 2;
            const yPos = (pageHeight - scaledHeight) / 2;
            
            pdf.addImage(
              image.url,
              'JPEG',
              xPos,
              yPos,
              scaledWidth,
              scaledHeight,
              undefined,
              'FAST'
            );
            
            resolve(null);
          };
        });
      }
      
      // Save the PDF
      pdf.save('converted-images.pdf');
      
    } catch (error) {
      console.error('Error converting to PDF:', error);
      alert('Error converting images to PDF. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
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
              Image to PDF Converter
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Convert your images to high-quality PDF documents with our professional converter. 
            Support for multiple formats and customizable settings.
          </p>
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
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2">
                      Drag & Drop Images Here
                  </h3>
                    <p className="text-gray-500 mb-4">
                    or click to select files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                      multiple
                    accept="image/*"
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

            {/* Image Preview */}
            <AnimatePresence>
          {images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {images.map((image) => (
                    <motion.div
                      key={image.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        <div className="aspect-square relative">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={() => removeImage(image.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium truncate">
                            {image.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(image.size)}
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
                    disabled={images.length === 0 || isConverting}
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

                  {images.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={clearAll}
                      className="w-full"
                    >
                      Clear All Images
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}