import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { MaterialUploader } from '../components/course/MaterialUploader';
import { ProcessingTimeline } from '../components/course/ProcessingTimeline';
import { MaterialPreviewModal } from '../components/course/MaterialPreviewModal';
import { MaterialViewerModal } from '../components/MaterialViewerModal';
import { StudyToolsModal } from '../components/StudyToolsModal';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { COURSES_FIXTURE } from '../fixtures/courses';
import { apiClient } from '../services/apiClient';
import { toast } from '../stores/useToastStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Star,
  CheckCircle2,
  Circle,
  PlayCircle,
  ArrowLeft,
  Sparkles,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileAudio,
  FileVideo,
  Trash2,
  Eye,
  Layers,
  FolderOpen,
  BookOpen,
  Target,
  BarChart3,
  AlertTriangle,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import type {
  Material,
  SourceType,
  CreateLearningObjectiveInput,
} from '@omnitutor/shared';

export const CourseDetailPage: React.FC = () => {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('materials');
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Material Viewer & Study Tools state
  const [viewerMaterialId, setViewerMaterialId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [studyToolsOpen, setStudyToolsOpen] = useState(false);
  const [studyToolsMaterialId, setStudyToolsMaterialId] = useState<string | undefined>(undefined);
  const [studyToolsTab, setStudyToolsTab] = useState<'summary' | 'flashcards' | 'notes'>('summary');

  // Module 13: Learning Objective Modal state
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [newObjCode, setNewObjCode] = useState('');
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjTopic, setNewObjTopic] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');

  // 1. Fetch Course from API
  const { data: apiCourse, isLoading: isCourseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const res = await apiClient.getCourse(courseId);
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    enabled: Boolean(courseId),
  });

  // Fallback to fixture course if not an API course
  const fixtureCourse = COURSES_FIXTURE.find((c) => c.id === courseId);

  // 2. Fetch Materials from API
  const { data: materialsData, refetch: refetchMaterials } = useQuery({
    queryKey: ['materials', courseId],
    queryFn: async () => {
      const res = await apiClient.getMaterials(courseId);
      return res.success && res.data ? res.data : [];
    },
    enabled: Boolean(courseId),
    refetchInterval: (query) => {
      // Auto-refresh every 2.5s if any material is in 'queued' or 'processing'
      const materials = query.state.data as Material[] | undefined;
      const hasPending = materials?.some((m) =>
        ['queued', 'processing', 'uploaded'].includes(m.status)
      );
      return hasPending ? 2500 : false;
    },
  });

  const materials: Material[] = materialsData || [];

  // Delete material mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      return await apiClient.deleteMaterial(courseId, materialId);
    },
    onSuccess: () => {
      toast.success('Material deleted.', 'Library Updated');
      queryClient.invalidateQueries({ queryKey: ['materials', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  // 3. Fetch Recent Materials
  const { data: recentMaterials } = useQuery({
    queryKey: ['recentMaterials'],
    queryFn: async () => {
      const res = await apiClient.getRecentMaterials(5);
      return res.success && res.data ? res.data : [];
    },
  });

  // 4. Module 13: Fetch Learning Objectives & Syllabus Coverage
  const { data: objectivesCoverage = [] } = useQuery({
    queryKey: ['objectivesCoverage', courseId],
    queryFn: async () => {
      const res = await apiClient.getLearningObjectivesCoverage(courseId);
      return res.success && res.data ? res.data : [];
    },
    enabled: Boolean(courseId),
  });

  // 5. Module 13: Fetch Instructor Course-Level Analytics
  const { data: instructorAnalytics } = useQuery({
    queryKey: ['instructorAnalytics', courseId],
    queryFn: async () => {
      const res = await apiClient.getInstructorCourseAnalytics(courseId);
      return res.success && res.data ? res.data : null;
    },
    enabled: Boolean(courseId),
    retry: false,
  });

  // Create learning objective mutation
  const createObjectiveMutation = useMutation({
    mutationFn: async (payload: CreateLearningObjectiveInput) => {
      return await apiClient.createLearningObjective(courseId, payload);
    },
    onSuccess: () => {
      toast.success('Learning objective created successfully.', 'Objective Added');
      setIsObjectiveModalOpen(false);
      setNewObjCode('');
      setNewObjTitle('');
      setNewObjTopic('');
      setNewObjDesc('');
      queryClient.invalidateQueries({ queryKey: ['objectivesCoverage', courseId] });
    },
    onError: () => {
      toast.error('Failed to create learning objective.', 'Validation Error');
    },
  });

  // Check URL query parameters for direct material viewer launch
  useEffect(() => {
    const matIdParam = searchParams.get('materialId');
    if (matIdParam) {
      setViewerMaterialId(matIdParam);
      setIsViewerOpen(true);
    }
  }, [searchParams]);

  if (isCourseLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400">
        Loading course curriculum and material library...
      </div>
    );
  }

  if (!apiCourse && !fixtureCourse) {
    return (
      <EmptyState
        title="Course Not Found"
        description="The requested course identifier does not match any current syllabus."
        action={
          <Button variant="primary" onClick={() => navigate('/courses')}>
            Return to Catalog
          </Button>
        }
      />
    );
  }

  const courseTitle = apiCourse ? apiCourse.title : fixtureCourse!.title;
  const courseDescription = apiCourse ? apiCourse.description : fixtureCourse!.description;
  const courseSubject = apiCourse ? apiCourse.subject : fixtureCourse!.category;
  const courseLevel = apiCourse ? apiCourse.academicLevel : fixtureCourse!.difficulty;
  const materialCount = apiCourse ? apiCourse.materialCount : materials.length;
  const indexedChunks = apiCourse ? apiCourse.indexedChunkCount : 0;

  const handleResumeCourse = () => {
    toast.info(`Launching interactive tutor session for "${courseTitle}"`, 'Session Starting');
    navigate('/tutor');
  };

  const getSourceIcon = (sourceType: SourceType) => {
    switch (sourceType) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-500" />;
      case 'pptx':
        return <FileSpreadsheet className="w-4 h-4 text-amber-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'txt':
      case 'md':
        return <FileCode className="w-4 h-4 text-emerald-500" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-purple-500" />;
      case 'video':
        return <FileVideo className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/courses"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Courses Catalog
        </Link>
      </div>

      {/* Course Hero */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2">
            <Badge variant="brand">{courseSubject}</Badge>
            <Badge variant="neutral" className="capitalize">{courseLevel}</Badge>
            {apiCourse && (
              <Badge
                variant={
                  apiCourse.processingStatus === 'indexed'
                    ? 'success'
                    : apiCourse.processingStatus === 'processing'
                    ? 'warning'
                    : 'neutral'
                }
                className="capitalize"
              >
                {apiCourse.processingStatus}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
            {courseTitle}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {courseDescription}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              {materials.length || materialCount} Materials
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {indexedChunks} Indexed Chunks
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              Adaptive Pacing
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              4.9 Rating
            </span>
          </div>
        </div>

        {/* Action Callout Box */}
        <div className="w-full lg:w-72 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 shrink-0">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Knowledge Indexed</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {materials.filter((m) => m.status === 'indexed').length} / {Math.max(1, materials.length)} files
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    materials.length > 0
                      ? (materials.filter((m) => m.status === 'indexed').length / materials.length) * 100
                      : 100
                  }%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Traceable cognitive Socratic inquiry ready
            </p>
          </div>

          <Button
            id="btn-resume-course"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleResumeCourse}
          >
            <PlayCircle className="w-4 h-4 mr-1.5" />
            Resume Tutoring
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            onClick={() => {
              setStudyToolsMaterialId(undefined);
              setStudyToolsTab('summary');
              setStudyToolsOpen(true);
            }}
          >
            <Sparkles className="w-4 h-4" />
            Course Study Tools
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="materials">
            Learning Materials Library ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus & Modules</TabsTrigger>
          <TabsTrigger value="objectives">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              Objectives & Mapping ({objectivesCoverage.length})
            </span>
          </TabsTrigger>
          {instructorAnalytics && (
            <TabsTrigger value="instructor">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                Instructor Analytics
              </span>
            </TabsTrigger>
          )}
          <TabsTrigger value="overview">Course Overview</TabsTrigger>
          <TabsTrigger value="outcomes">Cognitive Outcomes</TabsTrigger>
        </TabsList>

        {/* Tab 1: Learning Materials Library (Module 4 & 5 Core UI) */}
        <TabsContent value="materials" className="space-y-6 pt-4">
          {/* Recently Viewed in this Course Banner */}
          {recentMaterials && recentMaterials.filter((r) => r.courseId === courseId).length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0 text-xs">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mr-2">
                    Recent Study Position:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {recentMaterials.find((r) => r.courseId === courseId)?.materialTitle}
                  </span>
                  {recentMaterials.find((r) => r.courseId === courseId)?.lastPosition?.page && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-2">
                      (Page {recentMaterials.find((r) => r.courseId === courseId)?.lastPosition?.page})
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const rec = recentMaterials.find((r) => r.courseId === courseId);
                  if (rec) {
                    setViewerMaterialId(rec.materialId);
                    setIsViewerOpen(true);
                  }
                }}
                className="text-xs shrink-0 shadow-xs"
              >
                Continue Reading
              </Button>
            </div>
          )}

          {/* Material Uploader */}
          <MaterialUploader
            courseId={courseId}
            onUploaded={() => {
              refetchMaterials();
              queryClient.invalidateQueries({ queryKey: ['course', courseId] });
            }}
          />

          {/* Materials List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <span>Uploaded Course Materials ({materials.length})</span>
            </h3>

            {materials.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs text-slate-500 space-y-2">
                <p>No materials uploaded yet.</p>
                <p className="text-[11px] text-slate-400">
                  Drag and drop PDF textbooks, slide decks, documents, or lecture notes above to start indexing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((mat) => (
                  <Card key={mat.id} className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                          {getSourceIcon(mat.sourceType)}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {mat.originalName}
                          </h4>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="uppercase font-mono text-[10px]">
                              {mat.sourceType}
                            </span>
                            <span>·</span>
                            <span>{(mat.sizeBytes / 1024).toFixed(1)} KB</span>

                            {mat.metadata?.pageCount && (
                              <>
                                <span>·</span>
                                <span>{mat.metadata.pageCount} pages</span>
                              </>
                            )}

                            {mat.metadata?.slideCount && (
                              <>
                                <span>·</span>
                                <span>{mat.metadata.slideCount} slides</span>
                              </>
                            )}

                            {mat.metadata?.durationSeconds && (
                              <>
                                <span>·</span>
                                <span>
                                  {Math.floor(mat.metadata.durationSeconds / 60)}m{' '}
                                  {mat.metadata.durationSeconds % 60}s
                                </span>
                              </>
                            )}

                            {mat.metadata?.ocrApplied && (
                              <Badge variant="warning" size="sm">
                                OCR Processed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {mat.status === 'indexed' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setViewerMaterialId(mat.id);
                                setIsViewerOpen(true);
                              }}
                              className="text-xs shadow-xs"
                            >
                              <BookOpen className="w-3.5 h-3.5 mr-1" />
                              Viewer
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setStudyToolsMaterialId(mat.id);
                                setStudyToolsTab('summary');
                                setStudyToolsOpen(true);
                              }}
                              className="text-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1" />
                              Study Tools
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setPreviewMaterial(mat);
                                setIsPreviewOpen(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Preview
                            </Button>
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete "${mat.originalName}" and remove indexed vectors?`)) {
                              deleteMaterialMutation.mutate(mat.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Processing Timeline & Progress */}
                    <ProcessingTimeline
                      courseId={courseId}
                      material={mat}
                      onRetrySuccess={() => {
                        refetchMaterials();
                      }}
                    />
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Syllabus & Modules */}
        <TabsContent value="syllabus" className="space-y-4 pt-4">
          {(fixtureCourse?.modules || []).map((mod, modIdx) => (
            <Card key={mod.id} className="p-4 sm:p-5">
              <div className="mb-3">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Module {modIdx + 1}
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {mod.title}
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {mod.lessons.map((lesson) => (
                  <div key={lesson.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {lesson.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                      <span>{lesson.title}</span>
                    </div>
                    <span className="text-slate-400 capitalize">{lesson.duration}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 3: Course Overview */}
        <TabsContent value="overview" className="pt-4">
          <Card className="space-y-4 p-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display">
              About This Course
            </h3>
            <p>{courseDescription}</p>
          </Card>
        </TabsContent>

        {/* Tab 4: Cognitive Outcomes */}
        <TabsContent value="outcomes" className="pt-4">
          <Card className="space-y-4 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Cognitive Learning Objectives
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Independently formulate state definitions and transition equations.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Evaluate locality tradeoffs between recursion trees and iterative matrices.</span>
              </li>
            </ul>
          </Card>
        </TabsContent>

        {/* Tab 5: Learning Objectives Mapping (Module 13 Priority 5) */}
        <TabsContent value="objectives" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                Explicit Learning Objectives & Syllabus Mapping
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Course topics, quiz questions, and grounded materials mapped to curricular competencies.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsObjectiveModalOpen(true)}
              className="text-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Learning Objective
            </Button>
          </div>

          {objectivesCoverage.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <Target className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No Learning Objectives Defined Yet
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Define curricular learning objectives to map practice questions and learning materials to explicit competencies.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsObjectiveModalOpen(true)}
              >
                Create Objective
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {objectivesCoverage.map((item) => (
                <Card
                  key={item.objective.id}
                  className="p-5 space-y-3.5 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                          {item.objective.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.objective.title}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                        Topic: {item.objective.topic}
                      </span>
                    </div>

                    <Badge
                      variant={
                        item.coverageStatus === 'fully_covered'
                          ? 'success'
                          : item.coverageStatus === 'partial'
                          ? 'brand'
                          : 'neutral'
                      }
                      className="capitalize text-[10px] shrink-0"
                    >
                      {item.coverageStatus.replace('_', ' ')}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.objective.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                      <span>{item.mappedQuestionsCount} Questions Mapped</span>
                      <span>•</span>
                      <span>{item.mappedMaterialsCount} Materials Linked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Mastery:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        {item.estimatedMastery}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 6: Instructor / Admin Analytics (Module 13 Priority 7) */}
        {instructorAnalytics && (
          <TabsContent value="instructor" className="space-y-6 pt-4">
            {/* Student Privacy Notice Banner */}
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                  Strict Student Privacy Protection Guarantee
                </span>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 mt-0.5 leading-relaxed">
                  {instructorAnalytics.privacyNotice}
                </p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Enrolled
                </span>
                <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                  {instructorAnalytics.totalEnrolledStudents}
                </div>
                <span className="text-[11px] text-slate-400">Enrolled Students</span>
              </Card>

              <Card className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active (Last 7 Days)
                </span>
                <div className="text-2xl font-bold font-display text-indigo-600 dark:text-indigo-400">
                  {instructorAnalytics.activeLearnersLast7Days}
                </div>
                <span className="text-[11px] text-indigo-500 font-medium">Recent Activity</span>
              </Card>

              <Card className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cohort Mastery
                </span>
                <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                  {instructorAnalytics.averageCohortMastery}%
                </div>
                <span className="text-[11px] text-emerald-500 font-semibold">Average Score</span>
              </Card>

              <Card className="p-5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Completion Rate
                </span>
                <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                  {instructorAnalytics.overallAssessmentCompletionRate}%
                </div>
                <span className="text-[11px] text-slate-400">Quizzes Finished</span>
              </Card>
            </div>

            {/* Cohort Score Distribution */}
            <Card className="p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cohort Score Distribution
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {instructorAnalytics.scoreDistribution.map((bucket, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-center space-y-1"
                  >
                    <span className="text-xs font-semibold text-slate-500">{bucket.range}</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {bucket.count}
                    </div>
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                      {bucket.percentage}% of cohort
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Topic Mastery Rankings */}
            <Card className="p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Curriculum Topic Mastery Rankings
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="pb-2">Topic</th>
                      <th className="pb-2">Average Mastery</th>
                      <th className="pb-2">Learner Count</th>
                      <th className="pb-2 text-right">Needs Revision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {instructorAnalytics.topicMasteryRankings.map((tm, tIdx) => (
                      <tr key={tIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                          {tm.topic}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`font-semibold ${
                              tm.averageMastery >= 70
                                ? 'text-emerald-600'
                                : tm.averageMastery >= 50
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {tm.averageMastery}%
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500">{tm.learnerCount} learners</td>
                        <td className="py-2.5 text-right">
                          {tm.needsRevisionCount > 0 ? (
                            <Badge variant="danger" className="text-[10px]">
                              {tm.needsRevisionCount} learners
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              None
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Frequently Missed Concepts */}
            {instructorAnalytics.frequentlyMissedConcepts &&
              instructorAnalytics.frequentlyMissedConcepts.length > 0 && (
                <Card className="p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Frequently Missed Concepts
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="pb-2">Concept / Topic</th>
                          <th className="pb-2">Incorrect Attempts</th>
                          <th className="pb-2">Total Attempts</th>
                          <th className="pb-2 text-right">Miss Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {instructorAnalytics.frequentlyMissedConcepts.map((mc, mIdx) => (
                          <tr key={mIdx}>
                            <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                              {mc.topic}
                            </td>
                            <td className="py-2.5 text-rose-600 font-medium">
                              {mc.incorrectAttemptsCount}
                            </td>
                            <td className="py-2.5 text-slate-500">{mc.totalAttemptsCount}</td>
                            <td className="py-2.5 text-right font-bold text-rose-600">
                              {Math.round(mc.missRate * 100)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
          </TabsContent>
        )}
      </Tabs>

      {/* Material Preview Modal */}
      <MaterialPreviewModal
        courseId={courseId}
        material={previewMaterial}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewMaterial(null);
        }}
      />

      {/* Material Interactive Viewer Modal */}
      <MaterialViewerModal
        materialId={viewerMaterialId}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setViewerMaterialId(null);
        }}
        onOpenStudyTools={(matId, tab) => {
          setStudyToolsMaterialId(matId);
          setStudyToolsTab(tab);
          setStudyToolsOpen(true);
        }}
      />

      {/* Study Tools Modal (AI Summaries, Adaptive Flashcards, Notebook) */}
      <StudyToolsModal
        courseId={courseId}
        materialId={studyToolsMaterialId}
        isOpen={studyToolsOpen}
        onClose={() => setStudyToolsOpen(false)}
        initialTab={studyToolsTab}
      />

      {/* Create Learning Objective Modal */}
      <Dialog
        open={isObjectiveModalOpen}
        onClose={() => setIsObjectiveModalOpen(false)}
        title="Add Course Learning Objective"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newObjCode || !newObjTitle || !newObjTopic || !newObjDesc) return;
            createObjectiveMutation.mutate({
              code: newObjCode.trim().toUpperCase(),
              title: newObjTitle.trim(),
              topic: newObjTopic.trim(),
              description: newObjDesc.trim(),
              materialIds: [],
            });
          }}
          className="space-y-4 pt-2 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Objective Code
              </label>
              <Input
                placeholder="e.g. LO-1"
                value={newObjCode}
                onChange={(e) => setNewObjCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Curricular Topic
              </label>
              <Input
                placeholder="e.g. Consensus Protocols"
                value={newObjTopic}
                onChange={(e) => setNewObjTopic(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Objective Title
            </label>
            <Input
              placeholder="e.g. Byzantine Agreement Invariants"
              value={newObjTitle}
              onChange={(e) => setNewObjTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Competency Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe what the student will be able to do or analyze..."
              value={newObjDesc}
              onChange={(e) => setNewObjDesc(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsObjectiveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createObjectiveMutation.isPending}
            >
              {createObjectiveMutation.isPending ? 'Saving...' : 'Create Objective'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
