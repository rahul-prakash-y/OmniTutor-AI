import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { apiClient } from '../../services/apiClient';
import { toast } from '../../stores/useToastStore';
import type { AcademicLevel, Course } from '@omnitutor/shared';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (course: Course) => void;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('computer_science');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('intermediate');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    setLoading(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await apiClient.createCourse({
        title: title.trim(),
        description: description.trim(),
        subject,
        academicLevel,
        tags,
      });

      if (!res.success || !res.data) {
        setError(res.error?.message || 'Failed to create course');
        toast.error(res.error?.message || 'Failed to create course', 'Creation Failed');
        return;
      }

      toast.success(`Course "${res.data.title}" created successfully!`, 'Course Created');
      onCreated(res.data);
      onClose();
      setTitle('');
      setDescription('');
      setTagsInput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create course';
      setError(msg);
      toast.error(msg, 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      size="md"
      title="Create New Course Curriculum"
      description="Define course scope, subject discipline, and target academic difficulty."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            id="btn-submit-create-course"
            type="submit"
            form="create-course-form"
            variant="primary"
            isLoading={loading}
          >
            Create Course
          </Button>
        </>
      }
    >
      <form id="create-course-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="course-title"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Course Title *
          </label>
          <Input
            id="course-title"
            placeholder="e.g. Distributed Consensus & Raft Protocol"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="course-description"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Description & Objectives *
          </label>
          <textarea
            id="course-description"
            rows={3}
            placeholder="Detailed syllabus description and expected learning outcomes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={loading}
            className="w-full text-xs sm:text-sm rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="course-subject"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Subject Discipline *
            </label>
            <select
              id="course-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
              className="w-full text-xs sm:text-sm rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="computer_science">Computer Science</option>
              <option value="mathematics">Mathematics</option>
              <option value="data_science">Data Science & AI</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="languages">Languages</option>
              <option value="humanities">Humanities</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="course-level"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Academic Level *
            </label>
            <select
              id="course-level"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value as AcademicLevel)}
              disabled={loading}
              className="w-full text-xs sm:text-sm rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate / Research</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="course-tags"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Tags (Comma separated)
          </label>
          <Input
            id="course-tags"
            placeholder="e.g. raft, distributed-systems, fault-tolerance"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={loading}
          />
        </div>
      </form>
    </Dialog>
  );
};
