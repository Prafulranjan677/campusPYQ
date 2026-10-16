import { useEffect , useState } from 'react';
import './App.css';
import { supabase } from './supabase';

const departments = [
  'Electronics & Communication Engineering',
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other Departments',
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [papers, setPapers] = useState([]);
  const [form, setForm] = useState({
    department: '',
    semester: '',
    subject: '',
    subjectCode: '',
    year: '2025',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
  loadPapers();
}, []);

async function loadPapers() {
  const { data, error } = await supabase
    .from('papers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load papers:', error.message);
    setMessage('Could not load papers: ' + error.message);
    return;
  }

  setPapers(
    data.map((row) => ({
      id: row.id,
      department: row.department,
      semester: String(row.semester),
      subject: row.subject,
      subjectCode: row.subject_code || '',
      year: String(row.exam_year),
      fileName: row.file_path.split('/').pop(),
      file_path: row.file_path,
    }))
  );
}
async function testSupabase() {
  const { data, error } = await supabase
    .from('papers')
    .select('*')
    .limit(1);

  if (error) {
    alert('Connection test failed: ' + error.message);
  } else {
    alert('Supabase connection successful!');
    console.log(data);
  }
}
 
async function handleUpload(event) {
  event.preventDefault();

  if (!selectedFile) {
    setMessage('Please select a PDF file.');
    return;
  }

  if (selectedFile.type !== 'application/pdf') {
    setMessage('Only PDF files are allowed.');
    return;
  }

  if (!form.department || !form.semester || !form.subject.trim()) {
    setMessage('Please complete all required fields.');
    return;
  }

  setMessage('Uploading paper...');

  const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${crypto.randomUUID()}-${safeName}`;

  try {
    // 1. Upload PDF to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('question-papers')
      .upload(filePath, selectedFile, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (storageError) {
      throw storageError;
    }

    // 2. Save paper details in the database
    const { data, error: databaseError } = await supabase
      .from('papers')
      .insert({
        department: form.department,
        semester: Number(form.semester),
        subject: form.subject.trim(),
        subject_code: form.subjectCode.trim() || null,
        exam_year: Number(form.year),
        file_path: filePath,
      })
      .select()
      .single();

    if (databaseError) {
      // Remove the uploaded file if saving its details fails
      await supabase.storage
        .from('question-papers')
        .remove([filePath]);

      throw databaseError;
    }

    // 3. Update the displayed list
    setPapers((previous) => [
      {
        id: data.id,
        department: data.department,
        semester: String(data.semester),
        subject: data.subject,
        subjectCode: data.subject_code || '',
        year: String(data.exam_year),
        fileName: selectedFile.name,
        file_path: data.file_path,
      },
      ...previous,
    ]);

    setForm({
      department: '',
      semester: '',
      subject: '',
      subjectCode: '',
      year: '2025',
    });

    setSelectedFile(null);
    event.target.reset();

    setMessage('Paper uploaded and saved successfully!');
    setActiveTab('dashboard');
  } catch (error) {
    console.error('Paper upload failed:', error);
    setMessage(`Upload failed: ${error.message}`);
  }
}

  function removePaper(id) {
    setPapers((previous) => previous.filter((paper) => paper.id !== id));
  }

 function viewPaper(paper) {
  const { data } = supabase.storage
    .from('question-papers')
    .getPublicUrl(paper.file_path);

  window.open(data.publicUrl, '_blank', 'noopener,noreferrer');
}

  return (
    <div className="admin-app">
      <button
  onClick={testSupabase}
  style={{
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 9999,
    padding: '10px',
    background: 'green',
    color: 'white',
    cursor: 'pointer'
  }}
>
  Test Supabase Connection
</button>
      <aside className="admin-sidebar">
        <a href="#admin" className="admin-logo">
          Campus<span>PYQ</span>
        </a>

        <p className="sidebar-caption">ADMINISTRATION</p>

        <button
          className={activeTab === 'dashboard' ? 'side-link active' : 'side-link'}
          onClick={() => setActiveTab('dashboard')}
        >
          <span>▦</span> Dashboard
        </button>

        <button
          className={activeTab === 'upload' ? 'side-link active' : 'side-link'}
          onClick={() => setActiveTab('upload')}
        >
          <span>⇧</span> Upload PYQs
        </button>

        <button
          className={activeTab === 'manage' ? 'side-link active' : 'side-link'}
          onClick={() => setActiveTab('manage')}
        >
          <span>▤</span> Manage Papers
        </button>

        <div className="sidebar-bottom">
          <div className="admin-avatar">A</div>
          <div>
            <strong>Administrator</strong>
            <small>Prototype mode</small>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="breadcrumb">CampusPYQ / Admin</span>
            <h1>
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'upload' && 'Upload Question Papers'}
              {activeTab === 'manage' && 'Manage Question Papers'}
            </h1>
          </div>

          <span className="prototype-badge">PROTOTYPE</span>
        </header>

        {activeTab === 'dashboard' && (
          <section className="admin-content">
            <div className="welcome-panel">
              <div>
                <span className="welcome-label">ADMIN OVERVIEW</span>
                <h2>Welcome to CampusPYQ!</h2>
                <p>Manage question papers for your college from one place.</p>
                <button
                  className="primary-button"
                  onClick={() => setActiveTab('upload')}
                >
                  + Upload a paper
                </button>
              </div>
              <div className="welcome-illustration">📚</div>
            </div>

            <div className="stats-grid">
              <article className="stat-card">
                <span>Total Papers</span>
                <strong>{papers.length}</strong>
                <small>Added in this session</small>
              </article>

              <article className="stat-card">
                <span>Departments</span>
                <strong>
                  {new Set(papers.map((paper) => paper.department)).size}
                </strong>
                <small>With papers in this session</small>
              </article>

              <article className="stat-card">
                <span>Semester Collections</span>
                <strong>
                  {
                    new Set(
                      papers.map(
                        (paper) => `${paper.department}-${paper.semester}`,
                      ),
                    ).size
                  }
                </strong>
                <small>With papers in this session</small>
              </article>
            </div>

            <div className="admin-section-heading">
              <div>
                <h2>Recently added papers</h2>
                <p>Your latest additions in this session</p>
              </div>

              <button
                className="text-button"
                onClick={() => setActiveTab('manage')}
              >
                View all →
              </button>
            </div>

            {papers.length === 0 ? (
              <div className="empty-state">
                <span>📄</span>
                <h3>No papers added yet</h3>
                <p>Upload your first PYQ PDF to get started.</p>
                <button
                  className="primary-button"
                  onClick={() => setActiveTab('upload')}
                >
                  Upload your first paper
                </button>
              </div>
            ) : (
              <PaperTable
                papers={papers.slice(0, 5)}
                onView={viewPaper}
                onRemove={removePaper}
              />
            )}
          </section>
        )}

        {activeTab === 'upload' && (
          <section className="admin-content">
            <div className="form-panel">
              <div className="form-heading">
                <div className="form-icon">⇧</div>
                <div>
                  <h2>Upload a question paper</h2>
                  <p>
                    Add the paper details and select its PDF file.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpload}>
                <div className="form-grid">
                  <div className="admin-field full-width">
                    <label htmlFor="department">Department *</label>
                    <select
                      id="department"
                      name="department"
                      value={form.department}
                      onChange={updateForm}
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-field">
                    <label htmlFor="semester">Semester *</label>
                    <select
                      id="semester"
                      name="semester"
                      value={form.semester}
                      onChange={updateForm}
                      required
                    >
                      <option value="">Select semester</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => (
                        <option key={number} value={String(number)}>
                          Semester {number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-field">
                    <label htmlFor="year">Examination year *</label>
                    <select
                      id="year"
                      name="year"
                      value={form.year}
                      onChange={updateForm}
                      required
                    >
                      {Array.from({ length: 15 }, (_, index) => 2026 - index).map(
                        (year) => (
                          <option key={year} value={String(year)}>
                            {year}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="admin-field">
                    <label htmlFor="subject">Subject name *</label>
                    <input
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={updateForm}
                      placeholder="e.g. Engineering Mathematics"
                      required
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="subjectCode">Subject code</label>
                    <input
                      id="subjectCode"
                      name="subjectCode"
                      value={form.subjectCode}
                      onChange={updateForm}
                      placeholder="e.g. MAT101"
                    />
                  </div>

                  <div className="admin-field full-width">
                    <label htmlFor="pdf">Question paper PDF *</label>
                    <input
                      id="pdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) =>
                        setSelectedFile(event.target.files?.[0] ?? null)
                      }
                      required
                    />
                    <small>
                      Prototype limit: select a PDF smaller than 10 MB.
                      Do not upload confidential or restricted documents.
                    </small>
                  </div>
                </div>

                {message && (
                  <div className="admin-message" role="status">
                    {message}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setActiveTab('dashboard');
                      setMessage('');
                    }}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="primary-button">
                    Add question paper
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {activeTab === 'manage' && (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <h2>All question papers</h2>
                <p>
                  {papers.length} paper{papers.length === 1 ? '' : 's'} in
                  this browser session
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setActiveTab('upload')}
              >
                + Add paper
              </button>
            </div>

            {papers.length === 0 ? (
              <div className="empty-state">
                <span>📚</span>
                <h3>Your library is empty</h3>
                <p>Add a question paper to see it here.</p>
              </div>
            ) : (
              <PaperTable
                papers={papers}
                onView={viewPaper}
                onRemove={removePaper}
              />
            )}
          </section>
        )}

        <footer className="admin-footer">
          CampusPYQ Admin · Prototype only · Cloud storage not connected
        </footer>
      </main>
    </div>
  );
}

function PaperTable({ papers, onView, onRemove }) {
  return (
    <div className="table-wrapper">
      <table className="paper-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Department</th>
            <th>Semester</th>
            <th>Year</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {papers.map((paper) => (
            <tr key={paper.id}>
              <td>
                <strong>{paper.subject}</strong>
                <small>
                  {paper.subjectCode || 'No subject code'} · {paper.fileName}
                </small>
              </td>
              <td>{paper.department}</td>
              <td>{paper.semester}</td>
              <td>{paper.year}</td>
              <td>
                <div className="table-actions">
                  <button
                    className="view-button"
                    onClick={() => onView(paper)}
                  >
                    View
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => onRemove(paper.id)}
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;