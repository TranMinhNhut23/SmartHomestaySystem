import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';

interface ImagePickerProps {
  images: string[];
  imageUris: string[];
  onImagesChange: (images: string[], uris: string[]) => void;
  onRemoveImage: (index: number) => void;
  disabled?: boolean;
}

export default function HomestayImagePicker({
  images,
  imageUris,
  onImagesChange,
  onRemoveImage,
  disabled = false,
}: ImagePickerProps) {
  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const sizeInMB = (base64String.length * 3) / 4 / 1024 / 1024;
          if (sizeInMB > 5) {
            reject(new Error('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB'));
            return;
          }
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      throw new Error(error.message || 'Không thể convert ảnh');
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages: string[] = [];
        const newUris: string[] = [];

        for (const asset of result.assets) {
          try {
            const base64 = await convertImageToBase64(asset.uri);
            newImages.push(base64);
            newUris.push(asset.uri);
          } catch (error: any) {
            console.error('Error converting image:', error);
          }
        }

        if (newImages.length > 0) {
          onImagesChange([...images, ...newImages], [...imageUris, ...newUris]);
        }
      }
    } catch (error: any) {
      console.error('Error picking images:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.imageUploadArea}
        onPress={pickImages}
        disabled={disabled}
      >
        <Ionicons name="cloud-upload-outline" size={48} color="#0a7ea4" />
        <TouchableOpacity
          style={styles.browseButton}
          onPress={pickImages}
          disabled={disabled}
        >
          <ThemedText style={styles.browseButtonText}>Duyệt qua</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.uploadHint}>hoặc kéo thả ảnh vào đây</ThemedText>
      </TouchableOpacity>
      <ThemedText style={styles.hint}>
        Chọn ít nhất một ảnh. Định dạng: JPG, JPEG, PNG, GIF
      </ThemedText>

      {imageUris.length > 0 && (
        <View style={styles.imagePreviewContainer}>
          {imageUris.map((uri, index) => (
            <View key={index} style={styles.imagePreviewWrapper}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => onRemoveImage(index)}
                disabled={disabled}
              >
                <Ionicons name="close-circle" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  imageUploadArea: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    backgroundColor: '#fafafa',
  },
  browseButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});











