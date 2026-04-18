import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

// Mock data for steps
const ORIGAMI_STEPS = {
  '1': [
    { id: 1, text: "Start with a square piece of paper, color side down. Fold in half diagonally to create a triangle.", image: "https://picsum.photos/seed/origami1/600/600" },
    { id: 2, text: "Fold the triangle in half again to make a smaller triangle.", image: "https://picsum.photos/seed/origami2/600/600" },
    { id: 3, text: "Open the top flap and squash fold it into a square.", image: "https://picsum.photos/seed/origami3/600/600" },
    { id: 4, text: "Turn the model over and repeat the squash fold on the other side.", image: "https://picsum.photos/seed/origami4/600/600" },
    { id: 5, text: "Fold the top edges to the center line. This is called a petal fold preparation.", image: "https://picsum.photos/seed/origami5/600/600" },
  ],
  '2': [
    { id: 1, text: "Start with a square piece of paper. Fold in half horizontally and vertically.", image: "https://picsum.photos/seed/crane1/600/600" },
    { id: 2, text: "Fold diagonally both ways and unfold.", image: "https://picsum.photos/seed/crane2/600/600" },
    { id: 3, text: "Collapse into a square base.", image: "https://picsum.photos/seed/crane3/600/600" },
  ],
  '3': [
    { id: 1, text: "Start with a square piece of paper, color side up.", image: "https://picsum.photos/seed/swan1/600/600" },
    { id: 2, text: "Fold in half diagonally and unfold.", image: "https://picsum.photos/seed/swan2/600/600" },
    { id: 3, text: "Fold the edges to the center crease (kite base).", image: "https://picsum.photos/seed/swan3/600/600" },
  ]
};

export default function FoldingScreen() {
  const { foldingOrigami, setFoldingOrigami, theme } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = typeof foldingOrigami === 'object' && foldingOrigami.steps 
    ? foldingOrigami.steps 
    : (ORIGAMI_STEPS[foldingOrigami] || ORIGAMI_STEPS['1']);
  const step = steps[currentStep];
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setFoldingOrigami(null);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
          <Feather name="x" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={s.progressContainer}>
          <Text style={[s.progressText, { color: theme.text }]}>Step {currentStep + 1} of {totalSteps}</Text>
          <View style={[s.progressBarBg, { backgroundColor: theme.border }]}>
            <View style={[s.progressBarFill, { backgroundColor: theme.primary, width: `${progress}%` }]} />
          </View>
        </View>
        <View style={{ width: 44 }} /> {/* Spacer for alignment */}
      </View>

      {/* Content */}
      <View style={s.content}>
        <View style={[s.imageContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {step.image ? (
            <Image 
              source={{ uri: step.image }} 
              style={s.image} 
              resizeMode="cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <View style={[s.image, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }]}>
              <Feather name="image" size={48} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, marginTop: 16 }}>Imagem não disponível</Text>
            </View>
          )}
        </View>
        
        <View style={[s.instructionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.instructionText, { color: theme.text }]}>
            {step.instruction || step.text}
          </Text>
        </View>
      </View>

      {/* Footer Controls */}
      <View style={[s.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[s.navBtn, { backgroundColor: theme.bg, borderColor: theme.border, opacity: currentStep === 0 ? 0.5 : 1 }]} 
          onPress={handlePrev}
          disabled={currentStep === 0}
        >
          <Feather name="chevron-left" size={24} color={theme.text} />
          <Text style={[s.navBtnText, { color: theme.text }]}>Prev</Text>
        </TouchableOpacity>

        {currentStep === totalSteps - 1 ? (
          <TouchableOpacity 
            style={[s.navBtn, s.navBtnPrimary, { backgroundColor: theme.primary }]} 
            onPress={handleClose}
          >
            <Text style={[s.navBtnText, { color: theme.bg }]}>Finish</Text>
            <Feather name="check" size={24} color={theme.bg} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[s.navBtn, s.navBtnPrimary, { backgroundColor: theme.primary }]} 
            onPress={handleNext}
          >
            <Text style={[s.navBtnText, { color: theme.bg }]}>Next</Text>
            <Feather name="chevron-right" size={24} color={theme.bg} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: 50, 
    paddingBottom: 16, 
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progressContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  progressText: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  progressBarBg: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  
  content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  imageContainer: { 
    width: '100%', 
    aspectRatio: 1, 
    borderRadius: 24, 
    overflow: 'hidden', 
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  image: { width: '100%', height: '100%' },
  
  instructionCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  instructionText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    gap: 16,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  navBtnPrimary: {
    borderWidth: 0,
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: '700',
  }
});
