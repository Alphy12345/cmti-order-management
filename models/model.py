from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from db import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    enquiry_date = Column(String, nullable=True)
    customer_type = Column(String, nullable=True)
    address = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_no = Column(String, nullable=True)
    alternate_contact_details = Column(String, nullable=True)
    request_type = Column(String, nullable=True)
    email_reference = Column(String, nullable=True)
    quote_reference = Column(String, nullable=True)
    quote_description = Column(String, nullable=True)
    quote_date = Column(String, nullable=True)
    quote_amount = Column(String, nullable=True)

    revised_negotiated = Column("revised/negotiated", String, nullable=True)
    revised_negotiated_quote_date = Column("revised/negotiated_quote_date", String, nullable=True)
    revised_negotiated_quote_amount = Column("revised/negotiated_quote_amount", String, nullable=True)

    quotation_given_by_name = Column(String, nullable=True)
    quotation_given_by_department = Column(String, nullable=True)
    project_number = Column(String, nullable=True)
    party_name = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    key_deliverables = Column(String, nullable=True)
    order_number = Column(String, nullable=True)
    order_date = Column(String, nullable=True)
    delivery_date = Column(String, nullable=True)
    extended_delivery_date = Column(String, nullable=True)
    date_of_actual_commencement = Column(String, nullable=True)
    order_value = Column(String, nullable=True)
    details_of_external_internal_review_meeting = Column(String, nullable=True)
    project_co_ordinator = Column(String, nullable=True)
    center = Column(String, nullable=True)
    co_ordinator_remarks = Column(String, nullable=True)
    closer_report = Column(String, nullable=True)
    technical_completed_year = Column(String, nullable=True)
    financial_completed_year = Column(String, nullable=True)
    dispatch_date = Column(String, nullable=True)
    ppm_remarks = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships with cascading delete
    documents = relationship(
        "Document",
        back_populates="proposal",
        cascade="all, delete-orphan"
    )

    payments = relationship(
        "Payment",
        back_populates="proposal",
        cascade="all, delete-orphan"
    )

    progress_entries = relationship(
        "Progress",
        back_populates="proposal",
        cascade="all, delete-orphan"
    )


class Stage(Base):
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now(), nullable=False)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    url = Column(String, nullable=True)

    project_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"))
    stage_id = Column(Integer, ForeignKey("stages.id", ondelete="SET NULL"))

    uploaded_by = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    proposal = relationship("Proposal", back_populates="documents")
    stage = relationship("Stage")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    invoice_no = Column(String, nullable=True)
    invoice_date = Column(String, nullable=True)
    gross_amount = Column(String, nullable=True)
    get_amount = Column(String, nullable=True)
    amount_claimed = Column(String, nullable=True)
    amount_recieved = Column(String, nullable=True)
    recieved_date = Column(String, nullable=True)
    tds = Column(String, nullable=True)
    get_tds = Column(String, nullable=True)
    ld = Column(String, nullable=True)
    bal = Column(String, nullable=True)
    follow_up_status = Column(String, nullable=True)

    project_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"))
    stage_id = Column(Integer, ForeignKey("stages.id", ondelete="SET NULL"))

    created_at = Column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    proposal = relationship("Proposal", back_populates="payments")
    stage = relationship("Stage")


class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    remarks = Column(String, nullable=True)

    project_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"))
    stage_id = Column(Integer, ForeignKey("stages.id", ondelete="SET NULL"))

    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    proposal = relationship("Proposal", back_populates="progress_entries")
    stage = relationship("Stage")
